import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { collections, workspaces } from "#backend/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { LexoRank } from "lexorank";
import { ORPCError } from "@orpc/server";

const rankAt = (ranks: string[], index: number): string => {
  const previous = ranks[index - 1] ? LexoRank.parse(ranks[index - 1]) : null;
  const next = ranks[index] ? LexoRank.parse(ranks[index]) : null;

  if (previous && next) return `${previous.between(next)}`;
  if (previous) return `${previous.genNext()}`;
  if (next) return `${next.genPrev()}`;
  return `${LexoRank.middle()}`;
};

const moveCollection = async (input: {
  id: string;
  workspaceID: string;
  newParentID?: string | null;
  index?: number;
}): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = toUUID(input.id);
  const requestedParentID = input.newParentID ? toUUID(input.newParentID) : null;

  await db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [collection] = await tx
      .select()
      .from(collections)
      .where(and(eq(collections.id, collectionID), eq(collections.workspaceID, workspaceID)))
      .for("update");

    if (!collection) throw new ORPCError("NOT_FOUND");
    if (!collection.parentID) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot move the root collection" });
    }

    const [root] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.workspaceID, workspaceID), isNull(collections.parentID)));
    const parentID = requestedParentID || root?.id;

    if (!parentID || parentID === collectionID) {
      throw new ORPCError("BAD_REQUEST", { message: "Cannot move a collection into itself" });
    }

    const [parent] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, parentID), eq(collections.workspaceID, workspaceID)));

    if (!parent) throw new ORPCError("NOT_FOUND", { message: "Parent collection not found" });

    const cycle = await tx.execute<{ id: string }>(sql`
      with recursive subtree as (
        select id from ${collections}
        where workspace_id = ${workspaceID}::uuid and id = ${collectionID}::uuid
        union all
        select child.id
        from ${collections} child
        inner join subtree parent on child.parent_id = parent.id
        where child.workspace_id = ${workspaceID}::uuid
      )
      select id from subtree where id = ${parentID}::uuid limit 1
    `);

    if (cycle.rows.length > 0) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot move a collection into one of its descendants"
      });
    }

    const siblings = await tx
      .select({ id: collections.id, rank: collections.rank })
      .from(collections)
      .where(and(eq(collections.workspaceID, workspaceID), eq(collections.parentID, parentID)))
      .orderBy(asc(collections.rank));
    const destination = siblings.filter((sibling) => sibling.id !== collectionID);
    const existingIndex = siblings.findIndex((sibling) => sibling.id === collectionID);
    const requestedIndex = input.index ?? (existingIndex >= 0 ? existingIndex : destination.length);
    const index = Math.min(Math.max(requestedIndex, 0), destination.length);
    const rank = rankAt(
      destination.map((sibling) => sibling.rank),
      index
    );

    await tx
      .update(collections)
      .set({ parentID, rank, updatedAt: new Date() })
      .where(and(eq(collections.id, collectionID), eq(collections.workspaceID, workspaceID)));
  });
};

export { moveCollection };
