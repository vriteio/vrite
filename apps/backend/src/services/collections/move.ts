import { collectionsDB, toCollectionID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const moveCollection = async (input: {
  id: string;
  workspaceID: string;
  newParentID?: string | null;
}): Promise<void> => {
  const workspaceID = toObjectID(input.workspaceID);
  const collectionObjID = toObjectID(input.id);

  const collection = await collectionsDB.findOne({
    _id: collectionObjID,
    workspaceID
  });

  if (!collection) throw new ORPCError("NOT_FOUND");

  const ancestors = collection.ancestors || [];
  const currentParentID =
    ancestors.length > 0 ? ancestors[ancestors.length - 1]?.toString() || null : null;
  const newParentID = input.newParentID ?? null;

  // Prevent moving to the same parent (no-op)
  const currentParentStr = currentParentID
    ? toCollectionID(ancestors[ancestors.length - 1]!)
    : null;

  if (currentParentStr === newParentID) return;

  // Prevent moving a collection into itself
  if (newParentID === input.id) {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot move a collection into itself" });
  }

  // Compute new ancestors
  let newAncestors: string[] = [];

  if (newParentID) {
    const newParent = await collectionsDB.findOne({
      _id: toObjectID(newParentID),
      workspaceID
    });

    if (!newParent) throw new ORPCError("NOT_FOUND");

    // Prevent cyclic: newParent must not be a descendant of the collection being moved
    const newParentAncestorStrs = newParent.ancestors.map((a) => toCollectionID(a));

    if (newParentAncestorStrs.includes(input.id) || toCollectionID(newParent._id) === input.id) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot move a collection into one of its descendants"
      });
    }

    newAncestors = [...newParent.ancestors.map((a) => toCollectionID(a)), newParentID];
  }

  const oldAncestors = collection.ancestors.map((a) => toCollectionID(a));

  // Update the moved collection's ancestors
  await collectionsDB.updateOne(
    { _id: collectionObjID },
    { $set: { ancestors: newAncestors.map(toObjectID) } }
  );

  // Remove from old parent's descendants
  if (currentParentStr) {
    await collectionsDB.updateOne(
      { _id: toObjectID(currentParentStr), workspaceID },
      { $pull: { descendants: collectionObjID } }
    );
  }

  // Add to new parent's descendants
  if (newParentID) {
    await collectionsDB.updateOne(
      { _id: toObjectID(newParentID), workspaceID },
      { $addToSet: { descendants: collectionObjID } }
    );
  }

  // Recursively update all descendant collections' ancestors
  // Old prefix: [...oldAncestors, input.id]
  // New prefix: [...newAncestors, input.id]
  const oldPrefix = [...oldAncestors, input.id];
  const newPrefix = [...newAncestors, input.id];

  const allDescendants = await collectionsDB
    .find({
      workspaceID,
      ancestors: collectionObjID
    })
    .toArray();

  for (const descendant of allDescendants) {
    const descAncestors = descendant.ancestors.map((a) => toCollectionID(a));
    // Replace the old prefix with the new prefix
    const prefixLength = oldPrefix.length;
    const updatedAncestors = [...newPrefix, ...descAncestors.slice(prefixLength)];

    await collectionsDB.updateOne(
      { _id: descendant._id },
      { $set: { ancestors: updatedAncestors.map(toObjectID) } }
    );
  }
};

export { moveCollection };
