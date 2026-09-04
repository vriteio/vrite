import {
  collectionSchemas,
  collections,
  schemaDraftContributors,
  schemaVersionContributors,
  schemaVersions
} from "#backend/db";
import type { SchemaApplicationResult } from "#backend/lib/data";
import { type ServiceResolveContext, withAuthorization } from "#backend/lib/policy";
import {
  toCollectionID,
  toSchemaMigrationID,
  toSchemaVersionID,
  toUUID
} from "#backend/lib/primitives";
import {
  hashSchemaDefinition,
  schemaDefinitionType,
  type SchemaDefinition
} from "#backend/lib/schema";
import { createEffectiveSchemaChange } from "#backend/lib/schema/migration/effective-change";
import { ORPCError } from "@orpc/server";
import { and, eq, isNotNull, isNull, max } from "drizzle-orm";

interface PlanSchemaApplicationInput {
  schemaID: string;
  name?: string;
  definition: SchemaDefinition;
}

type ResolvedSchemaApplicationPlan = Awaited<ReturnType<typeof resolveSchemaApplicationPlan>>;

const resolveSchemaApplicationPlan = async ({
  database,
  input,
  workspaceID
}: ServiceResolveContext<PlanSchemaApplicationInput>) => {
  const [schema] = await database
    .select({ id: collectionSchemas.id, collectionID: collectionSchemas.collectionID })
    .from(collectionSchemas)
    .innerJoin(
      collections,
      and(
        eq(collections.workspaceID, collectionSchemas.workspaceID),
        eq(collections.id, collectionSchemas.collectionID),
        isNotNull(collections.parentID),
        isNull(collections.deletedAt)
      )
    )
    .where(
      and(
        eq(collectionSchemas.id, toUUID(input.schemaID)),
        eq(collectionSchemas.workspaceID, workspaceID),
        eq(collectionSchemas.enabled, true)
      )
    )
    .for("update");

  if (!schema) throw new ORPCError("NOT_FOUND", { message: "Schema not found" });

  return schema;
};
const createSchemaApplicationPlan = withAuthorization<
  PlanSchemaApplicationInput,
  ResolvedSchemaApplicationPlan,
  SchemaApplicationResult
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:update", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaApplicationPlan,
    transaction: "locked-workspace"
  },
  async ({ auth, database, input, resolved, workspaceID }) => {
    const parsedDefinition = schemaDefinitionType.safeParse(input.definition);

    if (!parsedDefinition.success) {
      throw new ORPCError("BAD_REQUEST", {
        message: parsedDefinition.error.issues[0]?.message || "Schema is invalid"
      });
    }

    const definition = parsedDefinition.data;
    const definitionHash = hashSchemaDefinition(definition);
    const [activeLocalVersion] = await database
      .select({ id: schemaVersions.id, hash: schemaVersions.hash })
      .from(schemaVersions)
      .where(
        and(
          eq(schemaVersions.workspaceID, workspaceID),
          eq(schemaVersions.schemaID, resolved.id),
          eq(schemaVersions.active, true)
        )
      );

    if (activeLocalVersion?.hash === definitionHash) {
      return {
        changed: false,
        migrationID: null,
        schemaVersionID: toSchemaVersionID(activeLocalVersion.id),
        affectedCollectionIDs: [],
        totalEntries: 0
      };
    }

    const [{ nextVersion }] = await database
      .select({ nextVersion: max(schemaVersions.version) })
      .from(schemaVersions)
      .where(eq(schemaVersions.schemaID, resolved.id));
    const appliedBy = auth.session?.memberID ? toUUID(auth.session.memberID) : null;
    const [createdVersion] = await database
      .insert(schemaVersions)
      .values({
        workspaceID,
        schemaID: resolved.id,
        version: (nextVersion || 0) + 1,
        definition,
        hash: definitionHash,
        name: input.name,
        reason: "manual",
        active: false,
        appliedBy
      })
      .returning();
    const draftContributors = await database
      .select({ membershipID: schemaDraftContributors.membershipID })
      .from(schemaDraftContributors)
      .where(
        and(
          eq(schemaDraftContributors.workspaceID, workspaceID),
          eq(schemaDraftContributors.schemaID, resolved.id)
        )
      );
    const contributorIDs = [
      ...new Set([
        ...draftContributors.map(({ membershipID }) => membershipID),
        ...(appliedBy ? [appliedBy] : [])
      ])
    ];

    if (contributorIDs.length > 0) {
      await database.insert(schemaVersionContributors).values(
        contributorIDs.map((membershipID) => ({
          workspaceID,
          versionID: createdVersion.id,
          membershipID
        }))
      );
    }

    const plan = await createEffectiveSchemaChange({
      database,
      initiatedBy: appliedBy,
      rootCollectionIDs: [resolved.collectionID],
      schemaID: resolved.id,
      schemaVersionID: createdVersion.id,
      sourceOverrides: [
        {
          collectionID: resolved.collectionID,
          schemaID: resolved.id,
          versionID: createdVersion.id,
          definition
        }
      ],
      workspaceID
    });

    if (!plan.migrationID) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create an effective schema revision"
      });
    }

    return {
      changed: true,
      migrationID: toSchemaMigrationID(plan.migrationID),
      schemaVersionID: toSchemaVersionID(createdVersion.id),
      affectedCollectionIDs: plan.affectedCollectionIDs.map(toCollectionID),
      totalEntries: plan.totalEntries
    };
  }
);

export { createSchemaApplicationPlan };
export type { PlanSchemaApplicationInput };
