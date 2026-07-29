import { toCollectionID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { collections, type Collection, workspaces } from "#backend/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { LexoRank } from "lexorank";
import { ORPCError } from "@orpc/server";
import { ROOT_COLLECTION_NAME } from "./root";
import { loadCollectionTree } from "./queries";

const createCollection = async (
  input: Partial<Collection> & { workspaceID: string }
): Promise<Collection> => {
  if (input.name === ROOT_COLLECTION_NAME) {
    throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
  }

  const workspaceID = toUUID(input.workspaceID);
  const collectionID = input.id ? toUUID(input.id) : crypto.randomUUID();
  await db.transaction(async (tx) => {
    await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");
    const [root] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.workspaceID, workspaceID), isNull(collections.parentID)));

    if (!root) throw new ORPCError("NOT_FOUND", { message: "Root collection not found" });

    const lastAncestor = input.ancestors?.[input.ancestors.length - 1];
    const parentID = lastAncestor ? toUUID(lastAncestor) : root.id;
    const [parent] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(and(eq(collections.id, parentID), eq(collections.workspaceID, workspaceID)));

    if (!parent) throw new ORPCError("BAD_REQUEST", { message: "Parent collection not found" });

    const [lastSibling] = await tx
      .select({ rank: collections.rank })
      .from(collections)
      .where(and(eq(collections.workspaceID, workspaceID), eq(collections.parentID, parentID)))
      .orderBy(desc(collections.rank))
      .limit(1);
    const rank = lastSibling
      ? `${LexoRank.parse(lastSibling.rank).genNext()}`
      : `${LexoRank.middle()}`;

    await tx
      .insert(collections)
      .values({
        id: collectionID,
        workspaceID,
        parentID,
        name: input.name || "",
        rank
      })
      .onConflictDoNothing({ target: collections.id });
  });

  const tree = await loadCollectionTree(workspaceID);
  const result = tree.collections.find(
    (collection) => collection.id === toCollectionID(collectionID)
  );

  if (!result)
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create collection" });

  return result;
};

export { createCollection };
