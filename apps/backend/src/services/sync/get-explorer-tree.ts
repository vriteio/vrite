import {
  collectionSchemas,
  entries,
  schemaMigrationCollections,
  schemaMigrations,
  schemaVersions,
  type Collection,
  type Entry
} from "#backend/db";
import { type CollectionAccess, withAuthorization } from "#backend/lib/policy";
import {
  toCollectionID,
  toEntryID,
  toSchemaID,
  toSchemaMigrationID
} from "#backend/lib/primitives";
import { getPublishingStatusSnapshot, PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

interface GetExplorerTreeInput {
  includePublishing: boolean;
}
interface ExplorerTree {
  collections: Collection[];
  entries: Entry[];
  accessByCollectionID: Record<string, CollectionAccess>;
  workspaceContentAccess: CollectionAccess;
  topLevelCollectionIDs: string[];
  schemas: Array<{
    id: string;
    collectionID: string;
    enabled: boolean;
    hasActiveVersion: boolean;
    hasUnappliedChanges: boolean;
  }>;
  activeSchemaMigrations: Array<{
    id: string;
    collectionIDs: string[];
    processedEntries: number;
    status: "queued" | "running" | "rolling_back";
    totalEntries: number;
  }>;
  publishing: { enabledCollectionIDs: string[]; unpublishedEntryIDs: string[] } | null;
}

const getExplorerTree = withAuthorization<GetExplorerTreeInput, undefined, ExplorerTree>(
  { tree: true },
  async ({ authorization, database, input, workspaceID }) => {
    const [entryRows, schemaRows, migrationRows, publishing] = await Promise.all([
      database
        .select()
        .from(entries)
        .where(and(eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt)))
        .orderBy(desc(entries.rank)),
      database
        .select({
          id: collectionSchemas.id,
          collectionID: collectionSchemas.collectionID,
          draftHash: collectionSchemas.draftHash,
          activeHash: schemaVersions.hash
        })
        .from(collectionSchemas)
        .leftJoin(
          schemaVersions,
          and(
            eq(schemaVersions.workspaceID, collectionSchemas.workspaceID),
            eq(schemaVersions.schemaID, collectionSchemas.id),
            eq(schemaVersions.active, true)
          )
        )
        .where(
          and(eq(collectionSchemas.workspaceID, workspaceID), eq(collectionSchemas.enabled, true))
        ),
      database
        .select({
          id: schemaMigrations.id,
          collectionID: schemaMigrationCollections.collectionID,
          processedEntries: schemaMigrations.processedEntries,
          status: schemaMigrations.status,
          totalEntries: schemaMigrations.totalEntries
        })
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
            inArray(schemaMigrations.status, ["queued", "running", "rolling_back"])
          )
        ),
      input.includePublishing
        ? getPublishingStatusSnapshot({
            workspaceID,
            channel: PUBLISHED_CHANNEL_CODE
          })
        : null
    ]);
    const entryRowsByID = new Map(entryRows.map((entry) => [toEntryID(entry.id), entry]));
    const rootCollection = authorization.collections.find(({ id }) => {
      return id === authorization.rootID;
    });
    const workspaceContentAccess = authorization.getAccess();
    const migrationsByID = new Map<
      string,
      {
        collectionIDs: string[];
        processedEntries: number;
        status: "queued" | "running" | "rolling_back";
        totalEntries: number;
      }
    >();

    if (!rootCollection || !workspaceContentAccess) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Workspace content tree is unavailable"
      });
    }

    for (const migration of migrationRows) {
      const collectionID = toCollectionID(migration.collectionID);

      if (!authorization.canAccessCollection(collectionID)) continue;

      const current = migrationsByID.get(migration.id);

      migrationsByID.set(migration.id, {
        collectionIDs: [...(current?.collectionIDs || []), collectionID],
        processedEntries: migration.processedEntries,
        status: migration.status as "queued" | "running" | "rolling_back",
        totalEntries: migration.totalEntries
      });
    }

    return {
      collections: authorization.collections.filter(({ id }) => id !== authorization.rootID),
      accessByCollectionID: authorization.toAccessRecord(),
      workspaceContentAccess,
      topLevelCollectionIDs: rootCollection.descendants,
      activeSchemaMigrations: [...migrationsByID].map(([id, migration]) => ({
        id: toSchemaMigrationID(id),
        ...migration
      })),
      schemas: schemaRows.flatMap((schema) => {
        const collectionID = toCollectionID(schema.collectionID);

        if (!authorization.canAccessCollection(collectionID)) return [];

        return [
          {
            id: toSchemaID(schema.id),
            collectionID,
            enabled: true,
            hasActiveVersion: Boolean(schema.activeHash),
            hasUnappliedChanges: Boolean(schema.draftHash) && schema.draftHash !== schema.activeHash
          }
        ];
      }),
      entries: entryRows
        .filter((entry) => {
          const collectionID = entry.collectionID ? toCollectionID(entry.collectionID) : null;

          return authorization.canAccessCollection(collectionID);
        })
        .map((entry) => ({
          id: toEntryID(entry.id),
          name: entry.name,
          order: entry.rank,
          collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
        })),
      publishing: publishing
        ? {
            enabledCollectionIDs: publishing.enabledCollectionIDs.filter((collectionID) => {
              return (
                collectionID !== authorization.rootID &&
                authorization.canAccessCollection(collectionID)
              );
            }),
            unpublishedEntryIDs: publishing.entries
              .filter(({ entryID, hasUnpublishedChanges }) => {
                const entry = entryRowsByID.get(entryID);
                const collectionID = entry?.collectionID
                  ? toCollectionID(entry.collectionID)
                  : null;

                return hasUnpublishedChanges && authorization.canAccessCollection(collectionID);
              })
              .map(({ entryID }) => entryID)
          }
        : null
    };
  }
);

export { getExplorerTree };
