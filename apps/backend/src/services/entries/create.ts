import { rankBetweenNeighbors, toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { collections, contents, entries, type Entry, workspaces } from "#backend/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { normalizeEntryName } from "#backend/lib/validation";

const createEntry = async (input: Partial<Entry> & { workspaceID: string }): Promise<Entry> => {
  const workspaceID = toUUID(input.workspaceID);
  const entryID = input.id ? toUUID(input.id) : crypto.randomUUID();
  const collectionID = input.collectionID ? toUUID(input.collectionID) : null;
  const entry = await db.transaction(async (tx) => {
    if (collectionID) {
      const [parent] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(
          and(
            eq(collections.id, collectionID),
            eq(collections.workspaceID, workspaceID),
            isNull(collections.deletedAt)
          )
        )
        .for("update");

      if (!parent) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
    } else {
      await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(eq(workspaces.id, workspaceID))
        .for("update");
    }

    const siblingFilter = collectionID
      ? and(
          eq(entries.workspaceID, workspaceID),
          eq(entries.collectionID, collectionID),
          isNull(entries.deletedAt)
        )
      : and(
          eq(entries.workspaceID, workspaceID),
          isNull(entries.collectionID),
          isNull(entries.deletedAt)
        );
    const [last] = await tx
      .select({ rank: entries.rank })
      .from(entries)
      .where(siblingFilter)
      .orderBy(desc(entries.rank))
      .limit(1);
    const rank = rankBetweenNeighbors(last?.rank);

    await tx
      .insert(entries)
      .values({
        id: entryID,
        workspaceID,
        collectionID,
        name: normalizeEntryName(input.name ?? "Untitled"),
        rank
      })
      .onConflictDoNothing({ target: entries.id });
    const [created] = await tx
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (!created) {
      throw new ORPCError("BAD_REQUEST", { message: "Entry ID belongs to another workspace" });
    }

    await tx
      .insert(contents)
      .values({ entryID: created.id, workspaceID: created.workspaceID })
      .onConflictDoNothing({ target: contents.entryID });

    return created;
  });

  return {
    id: toEntryID(entry.id),
    name: entry.name,
    order: entry.rank,
    collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
  };
};

export { createEntry };
