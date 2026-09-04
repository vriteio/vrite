import { schemaMigrationCollections, schemaMigrations } from "#backend/db";
import { mapSchemaMigration, type SchemaMigrationDetails } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { and, desc, eq, inArray } from "drizzle-orm";

interface GetActiveSchemaMigrationInput {
  collectionID: string;
}

const getActiveSchemaMigration = withAuthorization<
  GetActiveSchemaMigrationInput,
  undefined,
  SchemaMigrationDetails | null
>(
  {
    actions: ({ input }) => ({
      collections: [{ action: "collection:read", collectionID: input.collectionID }]
    })
  },
  async ({ database, input, workspaceID }) => {
    const [migration] = await database
      .select({ migration: schemaMigrations })
      .from(schemaMigrationCollections)
      .innerJoin(
        schemaMigrations,
        and(
          eq(schemaMigrations.workspaceID, schemaMigrationCollections.workspaceID),
          eq(schemaMigrations.id, schemaMigrationCollections.migrationID)
        )
      )
      .where(
        and(
          eq(schemaMigrationCollections.workspaceID, workspaceID),
          eq(schemaMigrationCollections.collectionID, toUUID(input.collectionID)),
          inArray(schemaMigrations.status, ["queued", "running", "rolling_back"])
        )
      )
      .orderBy(desc(schemaMigrations.createdAt))
      .limit(1);

    return migration ? mapSchemaMigration(migration.migration, []) : null;
  }
);

export { getActiveSchemaMigration };
