import { collectionsDB, Collection, toCollectionID, FullCollection } from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";

const createCollection = async (
  input: Partial<Collection> & {
    workspaceID: string;
  }
): Promise<Collection> => {
  const collection: UnderscoreID<FullCollection<ObjectId>> = {
    _id: new ObjectId(),
    name: input.name || "",
    ancestors: (input.ancestors || []).map(toObjectID),
    descendants: (input.descendants || []).map(toObjectID),
    workspaceID: toObjectID(input.workspaceID)
  };

  await collectionsDB.insertOne(collection);

  return {
    ...collection,
    id: toCollectionID(collection._id),
    ancestors: collection.ancestors.map((id) => toCollectionID(id)),
    descendants: collection.descendants.map((id) => toCollectionID(id))
  };
};

export { createCollection };
