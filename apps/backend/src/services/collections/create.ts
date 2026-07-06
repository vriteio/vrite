import { collectionsDB, Collection, toCollectionID, FullCollection } from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { ObjectId } from "mongodb";
import { getRootCollection, ROOT_COLLECTION_NAME } from "./root";

const createCollection = async (
  input: Partial<Collection> & {
    workspaceID: string;
  }
): Promise<Collection> => {
  if (input.name === ROOT_COLLECTION_NAME) {
    throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
  }

  const workspaceID = toObjectID(input.workspaceID);
  const collection: UnderscoreID<FullCollection<ObjectId>> = {
    _id: input.id ? toObjectID(input.id) : new ObjectId(),
    name: input.name || "",
    ancestors: (input.ancestors || []).map(toObjectID),
    descendants: (input.descendants || []).map(toObjectID),
    workspaceID
  };

  await collectionsDB.insertOne(collection);

  let parentID = collection.ancestors[collection.ancestors.length - 1];

  if (!parentID) {
    const rootCollection = await getRootCollection({ workspaceID });

    parentID = toObjectID(rootCollection.id);
  }

  if (parentID) {
    await collectionsDB.updateOne(
      {
        _id: parentID,
        workspaceID: collection.workspaceID
      },
      {
        $addToSet: {
          descendants: collection._id
        }
      }
    );
  }

  return {
    ...collection,
    id: toCollectionID(collection._id),
    ancestors: collection.ancestors.map((id) => toCollectionID(id)),
    descendants: collection.descendants.map((id) => toCollectionID(id))
  };
};

export { createCollection };
