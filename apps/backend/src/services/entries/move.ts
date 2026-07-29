import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { collections, entries, workspaces } from "#backend/db";
import { and, desc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { LexoRank } from "lexorank";
import { ORPCError } from "@orpc/server";

const moveEntry = async (input: {
  id: string;
  workspaceID: string;
  order: string;
  collectionID?: string | null;
}): Promise<string> => {
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.id);
  const collectionID =
    input.collectionID === undefined
      ? undefined
      : input.collectionID === null
        ? null
        : toUUID(input.collectionID);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND");

    const [entry] = await tx
      .select({ collectionID: entries.collectionID })
      .from(entries)
      .where(and(eq(entries.id, entryID), eq(entries.workspaceID, workspaceID)))
      .for("update");

    if (!entry) throw new ORPCError("NOT_FOUND");

    const destinationCollectionID = collectionID === undefined ? entry.collectionID : collectionID;

    if (destinationCollectionID) {
      const [collection] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(eq(collections.id, destinationCollectionID), eq(collections.workspaceID, workspaceID))
        )
        .for("update");

      if (!collection) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
    }

    const siblingFilter = destinationCollectionID
      ? and(
          eq(entries.workspaceID, workspaceID),
          eq(entries.collectionID, destinationCollectionID),
          ne(entries.id, entryID)
        )
      : and(
          eq(entries.workspaceID, workspaceID),
          isNull(entries.collectionID),
          ne(entries.id, entryID)
        );
    const [collision] = await tx
      .select({ rank: entries.rank })
      .from(entries)
      .where(and(siblingFilter, eq(entries.rank, input.order)))
      .limit(1);
    let rank = input.order;

    if (collision) {
      const [lower] = await tx
        .select({ rank: entries.rank })
        .from(entries)
        .where(and(siblingFilter, lt(entries.rank, input.order)))
        .orderBy(desc(entries.rank))
        .limit(1);

      if (lower) {
        rank = `${LexoRank.parse(lower.rank).between(LexoRank.parse(input.order))}`;
      } else {
        const [upper] = await tx
          .select({ rank: entries.rank })
          .from(entries)
          .where(and(siblingFilter, gt(entries.rank, input.order)))
          .orderBy(entries.rank)
          .limit(1);

        rank = upper
          ? `${LexoRank.parse(input.order).between(LexoRank.parse(upper.rank))}`
          : `${LexoRank.parse(input.order).genNext()}`;
      }
    }

    await tx
      .update(entries)
      .set({
        rank,
        ...(collectionID !== undefined && { collectionID }),
        updatedAt: new Date()
      })
      .where(and(eq(entries.id, entryID), eq(entries.workspaceID, workspaceID)));

    return rank;
  });
};

export { moveEntry };
