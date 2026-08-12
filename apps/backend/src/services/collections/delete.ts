import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { collections, entries, memberships, workspaces } from "#backend/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

interface DeletedContent {
  collectionIDs: string[];
  entryIDs: string[];
}

const deleteCollections = async (input: {
  ids: string[];
  workspaceID: string;
}): Promise<DeletedContent> => {
  if (input.ids.length === 0) return { collectionIDs: [], entryIDs: [] };

  const ids = input.ids.map(toUUID);
  const workspaceID = toUUID(input.workspaceID);
  return db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [root] = await tx
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

    const deletedCollections = await tx.execute<{ id: string }>(sql`
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

    const deletedEntries = await tx
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
      await tx
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
  });
};

export { deleteCollections };
