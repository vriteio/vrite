import { collectionsDB, Collection, toCollectionID, FullCollection } from "#backend/db";
import { generateUUID, toUUID, UnderscoreID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import type { UUID } from "#backend/lib/mongo";
import { getRootCollection, ROOT_COLLECTION_NAME } from "./root";

const createCollection = async (
  input: Partial<Collection> & {
    workspaceID: string;
  }
): Promise<Collection> => {
  if (input.name === ROOT_COLLECTION_NAME) {
    throw new ORPCError("BAD_REQUEST", { message: "Reserved collection name" });
  }

  const workspaceID = toUUID(input.workspaceID);
  const collection: UnderscoreID<FullCollection<UUID>> = {
    _id: input.id ? toUUID(input.id) : generateUUID(),
    name: input.name || "",
    ancestors: (input.ancestors || []).map(toUUID),
    descendants: (input.descendants || []).map(toUUID),
    workspaceID
  };

  await collectionsDB.insertOne(collection);

  let parentID = collection.ancestors[collection.ancestors.length - 1];

  if (!parentID) {
    const rootCollection = await getRootCollection({ workspaceID });

    parentID = toUUID(rootCollection.id);
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
