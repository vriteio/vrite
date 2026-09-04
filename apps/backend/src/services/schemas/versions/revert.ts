import {
  collectionSchemas,
  schemaDraftContributors,
  schemaVersionContributors,
  schemaVersions
} from "#backend/db";
import { prepareSchemaMigrationConnections } from "#backend/collaboration";
import { replaceContentDocument } from "#backend/lib/content";
import type { SchemaApplicationResult } from "#backend/lib/data";
import { withAuthorization, type AuthorizedServiceInput } from "#backend/lib/policy";
import {
  toCollectionID,
  toSchemaMigrationID,
  toSchemaID,
  toSchemaVersionID,
  toUUID
} from "#backend/lib/primitives";
import { createSchemaEditorDocument, schemaDefinitionType } from "#backend/lib/schema";
import { ORPCError } from "@orpc/server";
import { and, eq, max } from "drizzle-orm";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";
import { submitSchemaMigration } from "#backend/lib/queue";
import { createEffectiveSchemaChange } from "#backend/lib/schema/migration/effective-change";
import { resolveSchemaVersion } from "./resolve";

interface RevertSchemaVersionInput {
  confirmedDataLoss: boolean;
  name?: string;
  versionID: string;
}
interface PlannedSchemaVersionRevert {
  application: SchemaApplicationResult;
  collectionID: string;
  createdVersionIDs: string[];
  schemaID: string;
}

type ResolvedSchemaVersionRevert = Awaited<ReturnType<typeof resolveSchemaVersion>>;

const prepareSchemaVersionRevert = withAuthorization<
  RevertSchemaVersionInput,
  ResolvedSchemaVersionRevert
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:update", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaVersion
  },
  async ({ resolved }) => {
    // Flush pending edits before taking the draft snapshot and its recovery version.
    await prepareSchemaMigrationConnections([], [toSchemaID(resolved.version.schemaID)]);
  }
);
const planSchemaVersionRevert = withAuthorization<
  RevertSchemaVersionInput,
  ResolvedSchemaVersionRevert,
  PlannedSchemaVersionRevert
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:update", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaVersion,
    transaction: "locked-workspace"
  },
  async ({ auth, database, input, resolved, workspaceID }) => {
    const [schema] = await database
      .select({
        id: collectionSchemas.id,
        collectionID: collectionSchemas.collectionID,
        draftState: collectionSchemas.draftState,
        draftDocument: collectionSchemas.draftDocument,
        draftHash: collectionSchemas.draftHash
      })
      .from(collectionSchemas)
      .where(
        and(
          eq(collectionSchemas.id, resolved.version.schemaID),
          eq(collectionSchemas.workspaceID, workspaceID),
          eq(collectionSchemas.enabled, true)
        )
      )
      .for("update");

    if (!schema) throw new ORPCError("CONFLICT", { message: "Schema is not enabled" });

    const [{ nextVersion: latestVersion }] = await database
      .select({ nextVersion: max(schemaVersions.version) })
      .from(schemaVersions)
      .where(eq(schemaVersions.schemaID, schema.id));
    const appliedBy = auth.session?.memberID ? toUUID(auth.session.memberID) : null;
    const draftContributors = await database
      .select({ membershipID: schemaDraftContributors.membershipID })
      .from(schemaDraftContributors)
      .where(eq(schemaDraftContributors.schemaID, schema.id));
    const contributorIDs = [
      ...new Set([
        ...draftContributors.map(({ membershipID }) => membershipID),
        ...(appliedBy ? [appliedBy] : [])
      ])
    ];
    const [existingDraftVersion] = schema.draftHash
      ? await database
          .select({ id: schemaVersions.id })
          .from(schemaVersions)
          .where(
            and(eq(schemaVersions.schemaID, schema.id), eq(schemaVersions.hash, schema.draftHash))
          )
          .limit(1)
      : [];
    const createdVersionIDs: string[] = [];
    const validDraft = schema.draftDocument
      ? schemaDefinitionType.safeParse(schema.draftDocument).success
      : false;
    let nextVersion = latestVersion || 0;

    if (validDraft && schema.draftDocument && schema.draftHash && !existingDraftVersion) {
      nextVersion += 1;

      const [safetyVersion] = await database
        .insert(schemaVersions)
        .values({
          workspaceID,
          schemaID: schema.id,
          version: nextVersion,
          definition: schema.draftDocument,
          hash: schema.draftHash,
          reason: "auto",
          active: false,
          appliedBy: null
        })
        .returning({ id: schemaVersions.id });

      createdVersionIDs.push(toSchemaVersionID(safetyVersion.id));

      if (contributorIDs.length > 0) {
        await database.insert(schemaVersionContributors).values(
          contributorIDs.map((membershipID) => ({
            workspaceID,
            versionID: safetyVersion.id,
            membershipID
          }))
        );
      }
    }

    nextVersion += 1;

    const [createdVersion] = await database
      .insert(schemaVersions)
      .values({
        workspaceID,
        schemaID: schema.id,
        version: nextVersion,
        definition: resolved.version.definition,
        hash: resolved.version.hash,
        name: input.name,
        reason: "revert",
        sourceVersionID: resolved.version.id,
        active: false,
        appliedBy
      })
      .returning();

    createdVersionIDs.push(toSchemaVersionID(createdVersion.id));

    if (contributorIDs.length > 0) {
      await database.insert(schemaVersionContributors).values(
        contributorIDs.map((membershipID) => ({
          workspaceID,
          versionID: createdVersion.id,
          membershipID
        }))
      );
    }

    const draft = new Doc();

    if (schema.draftState) applyUpdate(draft, new Uint8Array(schema.draftState));

    replaceContentDocument(draft, createSchemaEditorDocument(createdVersion.definition));

    await database
      .update(collectionSchemas)
      .set({
        draftState: Buffer.from(encodeStateAsUpdate(draft)),
        draftDocument: createdVersion.definition,
        draftHash: createdVersion.hash,
        updatedAt: new Date()
      })
      .where(eq(collectionSchemas.id, schema.id));

    const plan = await createEffectiveSchemaChange({
      database,
      initiatedBy: appliedBy,
      rootCollectionIDs: [schema.collectionID],
      schemaID: schema.id,
      schemaVersionID: createdVersion.id,
      sourceOverrides: [
        {
          collectionID: schema.collectionID,
          schemaID: schema.id,
          versionID: createdVersion.id,
          definition: createdVersion.definition
        }
      ],
      workspaceID
    });

    if (!input.confirmedDataLoss) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Schema migrations require explicit data-loss confirmation"
      });
    }

    if (!plan.migrationID) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to create an effective schema revision"
      });
    }

    return {
      application: {
        changed: true,
        migrationID: toSchemaMigrationID(plan.migrationID),
        schemaVersionID: toSchemaVersionID(createdVersion.id),
        affectedCollectionIDs: plan.affectedCollectionIDs.map(toCollectionID),
        totalEntries: plan.totalEntries
      },
      collectionID: toCollectionID(schema.collectionID),
      createdVersionIDs,
      schemaID: toSchemaID(schema.id)
    };
  }
);
const revertSchemaVersion = async (
  input: RevertSchemaVersionInput & AuthorizedServiceInput
): Promise<PlannedSchemaVersionRevert> => {
  await prepareSchemaVersionRevert(input);

  const result = await planSchemaVersionRevert(input);
  await submitSchemaMigration({
    ...result.application,
    prepareAffectedContent: () => {
      return prepareSchemaMigrationConnections(result.application.affectedCollectionIDs);
    },
    workspaceID: input.auth.workspaceID
  });

  return result;
};

export { revertSchemaVersion };
export type { PlannedSchemaVersionRevert, RevertSchemaVersionInput };
