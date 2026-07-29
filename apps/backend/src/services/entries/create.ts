import { toCollectionID, toEntryID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { collections, contents, entries, type Entry, workspaces } from "#backend/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { LexoRank } from "lexorank";
import { ORPCError } from "@orpc/server";

const createEntry = async (input: Partial<Entry> & { workspaceID: string }): Promise<Entry> => {
  const workspaceID = toUUID(input.workspaceID);
  const entryID = input.id ? toUUID(input.id) : crypto.randomUUID();
  const collectionID = input.collectionID ? toUUID(input.collectionID) : null;
  const entry = await db.transaction(async (tx) => {
    if (collectionID) {
      const [parent] = await tx
        .select({ id: collections.id })
        .from(collections)
        .where(and(eq(collections.id, collectionID), eq(collections.workspaceID, workspaceID)))
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
      ? and(eq(entries.workspaceID, workspaceID), eq(entries.collectionID, collectionID))
      : and(eq(entries.workspaceID, workspaceID), isNull(entries.collectionID));
    const [last] = await tx
      .select({ rank: entries.rank })
      .from(entries)
      .where(siblingFilter)
      .orderBy(desc(entries.rank))
      .limit(1);
    const rank = last ? `${LexoRank.parse(last.rank).genNext()}` : `${LexoRank.middle()}`;

    await tx
      .insert(entries)
      .values({
        id: entryID,
        workspaceID,
        collectionID,
        name: input.name || "",
        rank
      })
      .onConflictDoNothing({ target: entries.id });
    const [created] = await tx
      .select()
      .from(entries)
      .where(and(eq(entries.id, entryID), eq(entries.workspaceID, workspaceID)));

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
