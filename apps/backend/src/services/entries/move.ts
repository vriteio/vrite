import { rankBetweenNeighbors, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { collections, entries, workspaces } from "#backend/db";
import { and, desc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const moveEntry = async (input: {
  id: string;
  workspaceID: string;
  order: string;
  collectionID?: string | null;
}): Promise<{ order: string }> => {
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
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .for("update");

    if (!entry) throw new ORPCError("NOT_FOUND");

    const destinationCollectionID = collectionID === undefined ? entry.collectionID : collectionID;

    if (destinationCollectionID) {
      const [collection] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, destinationCollectionID),
            eq(collections.workspaceID, workspaceID),
            isNull(collections.deletedAt)
          )
        )
        .for("update");

      if (!collection) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
    }

    const siblingFilter = destinationCollectionID
      ? and(
          eq(entries.workspaceID, workspaceID),
          eq(entries.collectionID, destinationCollectionID),
          ne(entries.id, entryID),
          isNull(entries.deletedAt)
        )
      : and(
          eq(entries.workspaceID, workspaceID),
          isNull(entries.collectionID),
          ne(entries.id, entryID),
          isNull(entries.deletedAt)
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
        rank = rankBetweenNeighbors(lower.rank, input.order);
      } else {
        const [upper] = await tx
          .select({ rank: entries.rank })
          .from(entries)
          .where(and(siblingFilter, gt(entries.rank, input.order)))
          .orderBy(entries.rank)
          .limit(1);

        rank = rankBetweenNeighbors(input.order, upper?.rank);
      }
    }

    await tx
      .update(entries)
      .set({
        rank,
        ...(collectionID !== undefined && { collectionID }),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    return { order: rank };
  });
};

export { moveEntry };
