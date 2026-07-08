import { collectionsDB, toCollectionID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";
import { ROOT_COLLECTION_NAME, getRootCollection } from "./root";

const moveCollection = async (input: {
  id: string;
  workspaceID: string;
  newParentID?: string | null;
  index?: number;
}): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionUUID = toUUID(input.id);
  const collection = await collectionsDB.findOne({ _id: collectionUUID, workspaceID });

  if (!collection) throw new ORPCError("NOT_FOUND");
  if (collection.name === ROOT_COLLECTION_NAME) {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot move the root collection" });
  }

  const newParentID = input.newParentID ?? null;
  const currentParent = collection.ancestors[collection.ancestors.length - 1];
  const currentParentID = currentParent ? toCollectionID(currentParent) : null;
  const parentChanged = currentParentID !== newParentID;

  if (!parentChanged && input.index === undefined) return;
  if (newParentID === input.id) {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot move a collection into itself" });
  }

  const rootCollection = await getRootCollection({ workspaceID });
  const rootCollectionUUID = toUUID(rootCollection.id);
  const parentUUID = newParentID ? toUUID(newParentID) : rootCollectionUUID;
  const newParent = await collectionsDB.findOne({ _id: parentUUID, workspaceID });

  if (!newParent) throw new ORPCError("NOT_FOUND");

  if (
    newParent._id.equals(collectionUUID) ||
    newParent.ancestors.some((ancestorID) => ancestorID.equals(collectionUUID))
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Cannot move a collection into one of its descendants"
    });
  }

  const newAncestors = newParentID ? [...newParent.ancestors, newParent._id] : [];

  if (parentChanged) {
    await collectionsDB.updateOne(
      { _id: collectionUUID, workspaceID },
      { $set: { ancestors: newAncestors } }
    );

    const previousParentUUID = currentParentID ? toUUID(currentParentID) : rootCollectionUUID;

    await collectionsDB.updateOne(
      { _id: previousParentUUID, workspaceID },
      { $pull: { descendants: collectionUUID } }
    );
  }

  const descendants = newParent.descendants.filter((id) => !id.equals(collectionUUID));
  const index =
    input.index === undefined
      ? descendants.length
      : Math.min(Math.max(input.index, 0), descendants.length);

  descendants.splice(index, 0, collectionUUID);

  await collectionsDB.updateOne({ _id: parentUUID, workspaceID }, { $set: { descendants } });

  if (!parentChanged) return;

  const oldPrefix = [...collection.ancestors, collectionUUID];
  const newPrefix = [...newAncestors, collectionUUID];

  const allDescendants = await collectionsDB
    .find({
      workspaceID,
      ancestors: collectionUUID
    })
    .toArray();

  if (allDescendants.length === 0) return;

  await collectionsDB.bulkWrite(
    allDescendants.map((descendant) => ({
      updateOne: {
        filter: { _id: descendant._id, workspaceID },
        update: {
          $set: {
            ancestors: [...newPrefix, ...descendant.ancestors.slice(oldPrefix.length)]
          }
        }
      }
    }))
  );
};

export { moveCollection };
