import { toCollectionID, toUUID } from "#backend/lib/primitives";
import { type Collection } from "#backend/db";
import { loadCollectionTree } from "#backend/lib/data";
import { ROOT_COLLECTION_NAME } from "#backend/lib/validation";
import { ORPCError } from "@orpc/server";

const listCollections = async (input: {
  workspaceID: string;
  ancestorID?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ collections: Collection[]; nextCursor: string | null }> => {
  const limit = input.limit || 50;
  const workspaceID = toUUID(input.workspaceID);
  const tree = await loadCollectionTree(workspaceID);
  const root = tree.rows.find((row) => row.parentID === null && row.name === ROOT_COLLECTION_NAME);
  const parentID = input.ancestorID ? toUUID(input.ancestorID) : root?.id;

  if (!parentID) return { collections: [], nextCursor: null };

  const siblings = tree.rows.filter((row) => {
    return row.parentID === parentID && row.name !== ROOT_COLLECTION_NAME;
  });

  let startIndex = 0;

  if (input.cursor) {
    const cursorID = toUUID(input.cursor);
    const cursorIndex = siblings.findIndex((row) => row.id === cursorID);

    if (cursorIndex === -1) {
      throw new ORPCError("BAD_REQUEST", { message: "Cursor collection not found" });
    }

    startIndex = cursorIndex + 1;
  }

  const rows = siblings.slice(startIndex, startIndex + limit + 1);
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const ids = pageRows.map((row) => toCollectionID(row.id));
  const selected = new Set(ids);

  return {
    collections: tree.collections.filter((collection) => selected.has(collection.id)),
    nextCursor: hasMore ? toCollectionID(pageRows[pageRows.length - 1].id) : null
  };
};

export { listCollections };
