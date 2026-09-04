import {
  collectionSchemas,
  entries,
  schemaMigrationCollections,
  schemaMigrationEntries,
  schemaMigrations
} from "#backend/db";
import {
  mapSchemaMigration,
  type SchemaMigrationContentLossEntry,
  type SchemaMigrationDetails
} from "#backend/lib/data";
import { type ServiceResolveContext, withAuthorization } from "#backend/lib/policy";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

interface GetSchemaMigrationInput {
  migrationID: string;
}
interface ResolvedSchemaMigration {
  collectionID: string;
  migration: typeof schemaMigrations.$inferSelect;
}

const resolveSchemaMigration = async ({
  database,
  input,
  workspaceID
}: ServiceResolveContext<GetSchemaMigrationInput>): Promise<ResolvedSchemaMigration> => {
  const [migration] = await database
    .select()
    .from(schemaMigrations)
    .where(
      and(
        eq(schemaMigrations.id, toUUID(input.migrationID)),
        eq(schemaMigrations.workspaceID, workspaceID)
      )
    );

  if (!migration) throw new ORPCError("NOT_FOUND", { message: "Schema migration not found" });

  const [localSchema] = migration.schemaID
    ? await database
        .select({ collectionID: collectionSchemas.collectionID })
        .from(collectionSchemas)
        .where(
          and(
            eq(collectionSchemas.workspaceID, workspaceID),
            eq(collectionSchemas.id, migration.schemaID)
          )
        )
        .limit(1)
    : [];
  const [affectedCollection] = localSchema
    ? []
    : await database
        .select({ collectionID: schemaMigrationCollections.collectionID })
        .from(schemaMigrationCollections)
        .where(
          and(
            eq(schemaMigrationCollections.workspaceID, workspaceID),
            eq(schemaMigrationCollections.migrationID, migration.id)
          )
        )
        .limit(1);
  const collectionID = localSchema?.collectionID || affectedCollection?.collectionID;

  if (!collectionID) throw new ORPCError("NOT_FOUND", { message: "Schema migration not found" });

  return { collectionID, migration };
};
const getSchemaMigration = withAuthorization<
  GetSchemaMigrationInput,
  ResolvedSchemaMigration,
  SchemaMigrationDetails
>(
  {
    actions: ({ resolved }) => ({
      collections: [{ action: "collection:read", collectionID: resolved.collectionID }]
    }),
    resolve: resolveSchemaMigration,
    tree: true
  },
  async ({ authorization, database, resolved, workspaceID }) => {
    const rows =
      resolved.migration.status === "completed"
        ? await database
            .select({
              id: entries.id,
              collectionID: entries.collectionID,
              name: entries.name
            })
            .from(schemaMigrationEntries)
            .innerJoin(
              entries,
              and(
                eq(entries.workspaceID, schemaMigrationEntries.workspaceID),
                eq(entries.id, schemaMigrationEntries.entryID),
                isNull(entries.deletedAt)
              )
            )
            .where(
              and(
                eq(schemaMigrationEntries.workspaceID, workspaceID),
                eq(schemaMigrationEntries.migrationID, resolved.migration.id),
                eq(schemaMigrationEntries.status, "completed"),
                eq(schemaMigrationEntries.contentLost, true)
              )
            )
        : [];
    const contentLossEntries: SchemaMigrationContentLossEntry[] = rows
      .filter(({ collectionID }) => authorization.canEntry(collectionID, "entry:read"))
      .map((entry) => ({
        id: toEntryID(entry.id),
        collectionID: toCollectionID(entry.collectionID!),
        name: entry.name
      }));

    return mapSchemaMigration(resolved.migration, contentLossEntries);
  }
);

export { getSchemaMigration };
