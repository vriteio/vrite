import { type Collection } from "#backend/db";
import { ORPCError } from "@orpc/server";
import { withAuthorization } from "#backend/lib/policy";

interface ListCollectionsInput {
  ancestorID?: string;
  cursor?: string;
  limit?: number;
}

const listCollections = withAuthorization<
  ListCollectionsInput,
  undefined,
  { collections: Collection[]; nextCursor: string | null }
>(
  {
    actions: ({ input }) => ({
      collections: [{ action: "collection:read", collectionID: input.ancestorID }]
    }),
    tree: true
  },
  async ({ authorization, input }) => {
    const limit = input.limit || 50;
    const parentID = input.ancestorID || authorization.rootID;
    const collectionsByID = new Map(
      authorization.collections.map((collection) => [collection.id, collection])
    );
    const parent = collectionsByID.get(parentID);
    const siblings = (parent?.descendants || []).flatMap((collectionID) => {
      const collection = collectionsByID.get(collectionID);

      return collection ? [collection] : [];
    });
    let startIndex = 0;

    if (input.cursor) {
      const cursorIndex = siblings.findIndex((collection) => collection.id === input.cursor);

      if (cursorIndex === -1) {
        throw new ORPCError("BAD_REQUEST", { message: "Cursor collection not found" });
      }

      startIndex = cursorIndex + 1;
    }

    const rows = siblings.slice(startIndex, startIndex + limit + 1);
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    return {
      collections: pageRows,
      nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null
    };
  }
);

export { listCollections };
