import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { collections, entries, entryPublications, memberships } from "#backend/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { withAuthorization } from "#backend/lib/policy";

interface DeletedContent {
  collectionIDs: string[];
  entryIDs: string[];
}

interface DeleteCollectionsInput {
  ids: string[];
}

const deleteCollections = withAuthorization<DeleteCollectionsInput, undefined, DeletedContent>(
  {
    actions: ({ input }) => ({
      collections: input.ids.map((collectionID) => ({
        action: "collection:delete",
        collectionID
      }))
    }),
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    if (input.ids.length === 0) return { collectionIDs: [], entryIDs: [] };
    const ids = input.ids.map(toUUID);
    const [root] = await database
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceID, workspaceID),
          isNull(collections.parentID),
          isNull(collections.deletedAt)
        )
      );

    if (root && ids.includes(root.id)) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot delete the root collection" });
    }

    const idList = sql.join(
      ids.map((id) => sql`${id}::uuid`),
      sql`, `
    );

    const deletedCollections = await database.execute<{ id: string }>(sql`
      with recursive subtree as (
        select id
        from ${collections}
        where workspace_id = ${workspaceID}::uuid
          and id in (${idList})
          and deleted_at is null
        union all
        select child.id
        from ${collections} child
        inner join subtree parent on child.parent_id = parent.id
        where child.workspace_id = ${workspaceID}::uuid
          and child.deleted_at is null
      )
      update ${collections}
      set deleted_at = now(), updated_at = now()
      where workspace_id = ${workspaceID}::uuid
        and deleted_at is null
        and id in (select id from subtree)
      returning id
    `);
    const collectionIDs = deletedCollections.rows.map((row) => row.id);

    if (collectionIDs.length === 0) return { collectionIDs: [], entryIDs: [] };

    const deletedEntries = await database
      .update(entries)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(entries.workspaceID, workspaceID),
          inArray(entries.collectionID, collectionIDs),
          isNull(entries.deletedAt)
        )
      )
      .returning({ id: entries.id });

    if (deletedEntries.length > 0) {
      await database.delete(entryPublications).where(
        inArray(
          entryPublications.entryID,
          deletedEntries.map(({ id }) => id)
        )
      );
      await database
        .update(memberships)
        .set({ currentEntryID: null, updatedAt: new Date() })
        .where(
          and(
            eq(memberships.workspaceID, workspaceID),
            inArray(
              memberships.currentEntryID,
              deletedEntries.map(({ id }) => id)
            )
          )
        );
    }

    return {
      collectionIDs: collectionIDs.map(toCollectionID),
      entryIDs: deletedEntries.map(({ id }) => toEntryID(id))
    };
  }
);

export { deleteCollections };
