import { Collection, collectionsDB, toCollectionID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { ObjectId } from "mongodb";

const ROOT_COLLECTION_NAME = "~";

const getRootCollection = async (input: {
  workspaceID: string | ObjectId;
}): Promise<Collection> => {
  const workspaceObjectID =
    typeof input.workspaceID === "string" ? toObjectID(input.workspaceID) : input.workspaceID;
  const rootCollection = await collectionsDB.findOne({
    workspaceID: workspaceObjectID,
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
