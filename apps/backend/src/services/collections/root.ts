import { Collection, collectionsDB, toCollectionID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import type { UUID } from "#backend/lib/mongo";

const ROOT_COLLECTION_NAME = "~";

const getRootCollection = async (input: {
  workspaceID: string | UUID;
}): Promise<Collection> => {
  const workspaceUUID =
    typeof input.workspaceID === "string" ? toUUID(input.workspaceID) : input.workspaceID;
  const rootCollection = await collectionsDB.findOne({
    workspaceID: workspaceUUID,
    name: ROOT_COLLECTION_NAME,
    ancestors: { $size: 0 }
  });

  if (!rootCollection) {
    throw new ORPCError("NOT_FOUND", { message: "Root collection not found" });
  }

  return {
    id: toCollectionID(rootCollection._id),
    name: rootCollection.name,
    ancestors: rootCollection.ancestors.map((id) => toCollectionID(id)),
    descendants: rootCollection.descendants.map((id) => toCollectionID(id))
  };
};

export { ROOT_COLLECTION_NAME, getRootCollection };
