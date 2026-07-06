import { collectionsDB, Collection, toCollectionID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";
import { getRootCollection, ROOT_COLLECTION_NAME } from "./root";

const listCollections = async (input: {
  workspaceID: string;
  ancestorID?: string;
  perPage?: number;
  page?: number;
}): Promise<Collection[]> => {
  const perPage = input.perPage || 50;
  const page = input.page || 1;
  const workspaceID = toObjectID(input.workspaceID);
  const parentCollection = input.ancestorID
    ? await collectionsDB.findOne({
        _id: toObjectID(input.ancestorID),
        workspaceID
      })
    : await getRootCollection({ workspaceID });
  const descendantIDs = (parentCollection?.descendants ?? []).map(toObjectID);
  const pageIDs = descendantIDs.slice((page - 1) * perPage, page * perPage);

  if (pageIDs.length === 0) return [];

  const collections = await collectionsDB
    .find({
      workspaceID,
      name: { $ne: ROOT_COLLECTION_NAME },
      _id: { $in: pageIDs }
    })
    .toArray();
  const collectionMap = new Map(collections.map((collection) => [`${collection._id}`, collection]));

  return pageIDs.flatMap((id) => {
    const collection = collectionMap.get(`${id}`);

    if (!collection) return [];

    return {
      id: toCollectionID(collection._id),
      name: collection.name,
      ancestors: collection.ancestors.map((id) => toCollectionID(id)),
      descendants: collection.descendants.map((id) => toCollectionID(id))
    };
  });
};

export { listCollections };
