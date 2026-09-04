import { collectionSchemas, collections, schemaVersions } from "#backend/db";
import {
  withAuthorization,
  type AuthorizedServiceInput,
  type ServiceResolveContext
} from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { prepareSchemaMigrationConnections } from "#backend/collaboration";
import { submitSchemaMigration } from "#backend/lib/queue";
import {
  createEffectiveSchemaChange,
  type EffectiveSchemaChangePlan
} from "#backend/lib/schema/migration/effective-change";

interface DeleteCollectionSchemaInput {
  confirmedDataLoss: boolean;
  schemaID: string;
}
interface DeleteCollectionSchemaResult extends EffectiveSchemaChangePlan {
  collectionID: string;
  schemaID: string;
}
interface ResolvedCollectionSchemaDeletion {
  collectionID: string;
  schemaID: string;
}

const resolveCollectionSchemaDeletion = async ({
  database,
  input,
  workspaceID
}: ServiceResolveContext<DeleteCollectionSchemaInput>): Promise<ResolvedCollectionSchemaDeletion> => {
  const [schema] = await database
    .select({ schemaID: collectionSchemas.id, collectionID: collectionSchemas.collectionID })
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
const planCollectionSchemaDeletion = withAuthorization<
  DeleteCollectionSchemaInput,
  ResolvedCollectionSchemaDeletion,
  DeleteCollectionSchemaResult
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:update", collectionID: resolved.collectionID }]
    }),
    resolve: resolveCollectionSchemaDeletion,
    transaction: "locked-workspace"
  },
  async ({ auth, database, input, resolved, workspaceID }) => {
    const plan = await createEffectiveSchemaChange({
      database,
      excludedSchemaIDs: [resolved.schemaID],
      initiatedBy: auth.session?.memberID ? toUUID(auth.session.memberID) : null,
      rootCollectionIDs: [resolved.collectionID],
      schemaID: resolved.schemaID,
      schemaVersionID: null,
      workspaceID
    });

    if (plan.migrationID && !input.confirmedDataLoss) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Schema migrations require explicit data-loss confirmation"
      });
    }

    // A worker migration disables the schema only after successful activation.
    if (!plan.migrationID) {
      await database
        .update(collectionSchemas)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(collectionSchemas.id, resolved.schemaID));
      await database
        .update(schemaVersions)
        .set({ active: false, updatedAt: new Date() })
        .where(
          and(eq(schemaVersions.schemaID, resolved.schemaID), eq(schemaVersions.active, true))
        );
    }

    return {
      ...plan,
      collectionID: resolved.collectionID,
      schemaID: resolved.schemaID
    };
  }
);
const deleteCollectionSchema = async (
  input: DeleteCollectionSchemaInput & AuthorizedServiceInput
): Promise<DeleteCollectionSchemaResult> => {
  const result = await planCollectionSchemaDeletion(input);

  await submitSchemaMigration({
    affectedCollectionIDs: result.affectedCollectionIDs,
    prepareAffectedContent: () => prepareSchemaMigrationConnections(result.affectedCollectionIDs),
    migrationID: result.migrationID,
    totalEntries: result.totalEntries,
    workspaceID: input.auth.workspaceID
  });

  return result;
};

export { deleteCollectionSchema };
export type { DeleteCollectionSchemaInput, DeleteCollectionSchemaResult };
