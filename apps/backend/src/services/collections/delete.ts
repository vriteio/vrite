import { collectionsDB, contentsDB, entriesDB } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ROOT_COLLECTION_NAME, getRootCollection } from "./root";
import { ORPCError } from "@orpc/server";

const deleteCollections = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  const ids = input.ids.map(toObjectID);
  const workspaceID = toObjectID(input.workspaceID);
  const rootCollection = await getRootCollection({ workspaceID });
  const collections = await collectionsDB
    .find({
      workspaceID,
      $or: [{ _id: { $in: ids } }, { ancestors: { $in: ids } }]
    })
    .toArray();
  const rootCollectionObjectID = toObjectID(rootCollection.id);
  const rootCollectionSelected = collections.some((collection) => {
    return collection.name === ROOT_COLLECTION_NAME && collection.ancestors.length === 0;
  });
  const deletedIDs = collections.map((collection) => collection._id);

  if (deletedIDs.length === 0) return;

  if (rootCollectionSelected || ids.some((id) => id.equals(rootCollectionObjectID))) {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot delete the root collection" });
  }

  const entries = await entriesDB
    .find({ collectionID: { $in: deletedIDs }, workspaceID }, { projection: { _id: 1 } })
    .toArray();
  const entryIDs = entries.map((entry) => entry._id);

  await entriesDB.deleteMany({ _id: { $in: entryIDs }, workspaceID });
  await contentsDB.deleteMany({ entryID: { $in: entryIDs }, workspaceID });
  await collectionsDB.deleteMany({ _id: { $in: deletedIDs }, workspaceID });
  await collectionsDB.updateMany(
    { workspaceID, descendants: { $in: deletedIDs } },
    { $pull: { descendants: { $in: deletedIDs } as any } }
  );
};

export { deleteCollections };
