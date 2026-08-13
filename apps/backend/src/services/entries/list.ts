import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, type Entry } from "#backend/db";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const listEntries = async (input: {
  workspaceID: string;
  collectionID?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ entries: Entry[]; nextCursor: string | null }> => {
  const limit = input.limit || 50;
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = input.collectionID !== undefined ? toUUID(input.collectionID) : undefined;
  const filters = [eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt)];

  if (input.cursor) {
    const cursorID = toUUID(input.cursor);
    const cursorFilters = [
      eq(entries.id, cursorID),
      eq(entries.workspaceID, workspaceID),
      isNull(entries.deletedAt)
    ];

    if (collectionID) cursorFilters.push(eq(entries.collectionID, collectionID));

    const [cursor] = await db
      .select({ rank: entries.rank })
      .from(entries)
      .where(and(...cursorFilters));

    if (!cursor) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cursor entry not found"
      });
    }

    filters.push(
      or(
        lt(entries.rank, cursor.rank),
        and(eq(entries.rank, cursor.rank), lt(entries.id, cursorID))
      )!
    );
  }
  if (collectionID) filters.push(eq(entries.collectionID, collectionID));

  const rows = await db
    .select()
    .from(entries)
    .where(and(...filters))
    .orderBy(desc(entries.rank), desc(entries.id))
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  return {
    entries: pageRows.map((entry) => ({
      id: toEntryID(entry.id),
      name: entry.name,
      order: entry.rank,
      collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
    })),
    nextCursor: hasMore ? toEntryID(pageRows[pageRows.length - 1].id) : null
  };
};

export { listEntries };
