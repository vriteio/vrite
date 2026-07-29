import { toCollectionID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { collections, type Collection } from "#backend/db";
import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { loadCollectionTree } from "./queries";

const ROOT_COLLECTION_NAME = "~";

const getRootCollection = async (input: { workspaceID: string }): Promise<Collection> => {
  const workspaceID = toUUID(input.workspaceID);
  const [root] = await db
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(
        eq(collections.workspaceID, workspaceID),
        isNull(collections.parentID),
        eq(collections.name, ROOT_COLLECTION_NAME)
      )
    );

  if (!root) throw new ORPCError("NOT_FOUND", { message: "Root collection not found" });

  const tree = await loadCollectionTree(workspaceID);
  const projected = tree.collections.find(
    (collection) => collection.id === toCollectionID(root.id)
  );

  if (!projected) throw new ORPCError("NOT_FOUND", { message: "Root collection not found" });

  return projected;
};

export { ROOT_COLLECTION_NAME, getRootCollection };
