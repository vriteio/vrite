import { collections, schemaMigrationCollections, schemaMigrations } from "#backend/db";
import { toUUID } from "#backend/lib/primitives";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import type { DatabaseClient, ServiceAuthorizationActions } from "./service";

const BLOCKED_COLLECTION_ACTIONS = new Set([
  "collection:create-child",
  "collection:update",
  "collection:move",
  "collection:delete",
  "collection:set-restricted",
  "collection:manage-restricted-access"
]);
const BLOCKED_ENTRY_ACTIONS = new Set([
  "entry:create",
  "entry:update",
  "entry:move",
  "entry:delete",
  "version:revert"
]);
const SUBTREE_COLLECTION_ACTIONS = new Set([
  "collection:update",
  "collection:move",
  "collection:delete",
  "collection:set-restricted",
  "collection:manage-restricted-access"
]);
const assertNoActiveSchemaMigration = async (
  database: DatabaseClient,
  workspaceID: string,
  actions?: ServiceAuthorizationActions
): Promise<void> => {
  const collectionActions = (actions?.collections || []).filter(({ action }) => {
    return BLOCKED_COLLECTION_ACTIONS.has(action);
  });
  const subtreeRootIDs = collectionActions
    .filter(({ action }) => SUBTREE_COLLECTION_ACTIONS.has(action))
    .flatMap(({ collectionID }) => (collectionID ? [toUUID(collectionID)] : []));
  const directCollectionIDs = collectionActions
    .filter(({ action }) => !SUBTREE_COLLECTION_ACTIONS.has(action))
    .flatMap(({ collectionID }) => (collectionID ? [toUUID(collectionID)] : []));
  const entryCollectionIDs = (actions?.entries || [])
    .filter(({ action }) => BLOCKED_ENTRY_ACTIONS.has(action))
    .flatMap(({ collectionID }) => (collectionID ? [toUUID(collectionID)] : []));
  const subtreeCollectionIDs =
    subtreeRootIDs.length > 0
      ? await database.execute<{ id: string }>(sql`
          with recursive subtree as (
            select id
            from ${collections}
            where workspace_id = ${workspaceID}::uuid
              and id in (${sql.join(
                subtreeRootIDs.map((collectionID) => sql`${collectionID}::uuid`),
                sql`, `
              )})
              and deleted_at is null
            union all
            select child.id
            from ${collections} child
            inner join subtree parent on child.parent_id = parent.id
            where child.workspace_id = ${workspaceID}::uuid
              and child.deleted_at is null
          )
          select id from subtree
        `)
      : null;
  const collectionIDs = [
    ...directCollectionIDs,
    ...entryCollectionIDs,
    ...(subtreeCollectionIDs?.rows.map(({ id }) => id) || [])
  ];

  if (collectionIDs.length === 0) return;

  const [activeMigration] = await database
    .select({ id: schemaMigrations.id })
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
        inArray(schemaMigrationCollections.collectionID, [...new Set(collectionIDs)]),
        inArray(schemaMigrations.status, ["queued", "running", "rolling_back"])
      )
    )
    .limit(1);

  if (activeMigration) {
    throw new ORPCError("CONFLICT", {
      message: "This collection is read-only while its schema migration is in progress"
    });
  }
};

export { assertNoActiveSchemaMigration };
