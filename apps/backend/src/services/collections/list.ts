import { collectionsDB, Collection, toCollectionID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const listCollections = async (input: {
  workspaceID: string;
  ancestorID?: string;
  perPage?: number;
  page?: number;
}): Promise<Collection[]> => {
  const perPage = input.perPage || 50;
  const page = input.page || 1;
  const cursor = collectionsDB.find({
    workspaceID: toObjectID(input.workspaceID),
    ...(input.ancestorID !== undefined
      ? input.ancestorID
        ? {
            $expr: {
              $eq: [{ $last: "$ancestors" }, toObjectID(input.ancestorID)]
            }
          }
        : { ancestors: { $size: 0 } }
      : {})
  });

  cursor.skip((page - 1) * perPage);

  const collections = await cursor.limit(perPage).toArray();

  return collections.map((collection) => {
    return {
      id: toCollectionID(collection._id),
      name: collection.name,
      ancestors: collection.ancestors.map((id) => toCollectionID(id)),
      descendants: collection.descendants.map((id) => toCollectionID(id))
    };
  });
};

export { listCollections };
