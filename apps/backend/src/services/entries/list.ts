import { toCollectionID, toEntryID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { entries, type Entry } from "#backend/db";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const listEntries = async (input: {
  workspaceID: string;
  collectionID?: string;
  lastOrder?: string;
  lastID?: string;
  perPage?: number;
  page?: number;
}): Promise<Entry[]> => {
  const perPage = input.perPage || 50;
  const page = input.page || 1;
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = input.collectionID !== undefined ? toUUID(input.collectionID) : undefined;
  const filters = [eq(entries.workspaceID, workspaceID)];

  if (input.lastOrder && collectionID === undefined) {
    throw new ORPCError("BAD_REQUEST", {
      message: "collectionID is required when lastOrder is provided"
    });
  }
  if (input.lastID) {
    const cursorID = toUUID(input.lastID);
    const cursorFilters = [eq(entries.id, cursorID), eq(entries.workspaceID, workspaceID)];

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

    const cursorRank = input.lastOrder ?? cursor.rank;

    filters.push(
      or(lt(entries.rank, cursorRank), and(eq(entries.rank, cursorRank), lt(entries.id, cursorID)))!
    );
  } else if (input.lastOrder) {
    filters.push(lt(entries.rank, input.lastOrder));
  }
  if (collectionID) filters.push(eq(entries.collectionID, collectionID));

  const rows = await db
    .select()
    .from(entries)
    .where(and(...filters))
    .orderBy(desc(entries.rank), desc(entries.id))
    .limit(perPage)
    .offset(input.lastOrder || input.lastID ? 0 : (page - 1) * perPage);

  return rows.map((entry) => ({
    id: toEntryID(entry.id),
    name: entry.name,
    order: entry.rank,
    collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
  }));
};

export { listEntries };
