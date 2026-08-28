import { rankBetweenNeighbors, toCollectionID, toUUID } from "#backend/lib/primitives";
import { collections, type Collection } from "#backend/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { loadCollectionTree } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { normalizeCollectionName, ROOT_COLLECTION_NAME } from "#backend/lib/validation";

interface CreateCollectionInput extends Partial<Pick<Collection, "id" | "name" | "restricted">> {
  parentID?: string;
}

const createCollection = withAuthorization<CreateCollectionInput, undefined, Collection>(
  {
    actions: ({ input }) => ({
      collections: [{ action: "collection:create-child", collectionID: input.parentID }]
    }),
    permissions: (input) =>
      input.restricted ? { session: ["restricted_collections"] } : undefined,
    plan: (input) => (input.restricted ? "pro" : undefined),
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    const name = normalizeCollectionName(input.name ?? "Untitled");

    if (name === ROOT_COLLECTION_NAME) {
      throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
    }

    const collectionID = input.id ? toUUID(input.id) : crypto.randomUUID();
    const [root] = await database
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceID, workspaceID),
          isNull(collections.parentID),
          isNull(collections.deletedAt)
        )
      );

    if (!root) throw new ORPCError("NOT_FOUND", { message: "Root collection not found" });

    const parentID = input.parentID ? toUUID(input.parentID) : root.id;
    const [parent] = await database
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.id, parentID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    if (!parent) throw new ORPCError("BAD_REQUEST", { message: "Parent collection not found" });

    const [lastSibling] = await database
      .select({ rank: collections.rank })
      .from(collections)
      .where(
        and(
          eq(collections.workspaceID, workspaceID),
          eq(collections.parentID, parentID),
          isNull(collections.deletedAt)
        )
      )
      .orderBy(desc(collections.rank))
      .limit(1);
    const rank = rankBetweenNeighbors(lastSibling?.rank);

    await database
      .insert(collections)
      .values({
        id: collectionID,
        workspaceID,
        parentID,
        name,
        rank,
        restricted: input.restricted
      })
      .onConflictDoNothing({ target: collections.id });

    const tree = await loadCollectionTree(workspaceID, false, database);
    const result = tree.collections.find(
      (collection) => collection.id === toCollectionID(collectionID)
    );

    if (!result)
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create collection" });

    return result;
  }
);

export { createCollection };
