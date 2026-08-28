import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { entries, type Entry } from "#backend/db";
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { withAuthorization } from "#backend/lib/policy";

interface ListEntriesInput {
  collectionID?: string;
  cursor?: string;
  limit?: number;
}
interface ResolvedListEntries {
  cursor?: { collectionID: string | null; rank: string };
}

const listEntries = withAuthorization<
  ListEntriesInput,
  ResolvedListEntries,
  { entries: Entry[]; nextCursor: string | null }
>(
  {
    actions: ({ input, resolved }) => ({
      entries: [
        { action: "entry:read", collectionID: input.collectionID },
        ...(resolved.cursor
          ? [{ action: "entry:read" as const, collectionID: resolved.cursor.collectionID }]
          : [])
      ]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      if (!input.cursor) return {};

      const cursorID = toUUID(input.cursor);
      const collectionID = input.collectionID ? toUUID(input.collectionID) : undefined;
      const cursorFilters = [
        eq(entries.id, cursorID),
        eq(entries.workspaceID, workspaceID),
        isNull(entries.deletedAt)
      ];

      if (collectionID) cursorFilters.push(eq(entries.collectionID, collectionID));

      const [cursor] = await database
        .select({ collectionID: entries.collectionID, rank: entries.rank })
        .from(entries)
        .where(and(...cursorFilters));

      if (!cursor) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cursor entry not found"
        });
      }

      return { cursor };
    },
    tree: true
  },
  async ({ authorization, database, input, resolved, workspaceID }) => {
    const limit = input.limit || 50;
    const collectionID = input.collectionID !== undefined ? toUUID(input.collectionID) : undefined;
    const filters = [eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt)];

    if (input.cursor && resolved.cursor) {
      const cursorID = toUUID(input.cursor);

      filters.push(
        or(
          lt(entries.rank, resolved.cursor.rank),
          and(eq(entries.rank, resolved.cursor.rank), lt(entries.id, cursorID))
        )!
      );
    }
    if (collectionID) {
      filters.push(eq(entries.collectionID, collectionID));
    } else {
      const accessibleCollectionIDs = authorization.collections.map(({ id }) => toUUID(id));

      filters.push(
        accessibleCollectionIDs.length > 0
          ? or(
              isNull(entries.collectionID),
              inArray(entries.collectionID, accessibleCollectionIDs)
            )!
          : isNull(entries.collectionID)
      );
    }

    const rows = await database
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
  }
);

export { listEntries };
