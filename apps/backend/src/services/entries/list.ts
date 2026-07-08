import { toCollectionID, entriesDB, Entry, toEntryID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

const listEntries = async (input: {
  workspaceID: string;
  collectionID?: string;
  lastOrder?: string;
  perPage?: number;
  page?: number;
}): Promise<Entry[]> => {
  const perPage = input.perPage || 50;
  const page = input.page || 1;
  const cursor = entriesDB
    .find({
      workspaceID: toUUID(input.workspaceID),
      ...(input.lastOrder && { order: { $lt: input.lastOrder } }),
      ...(input.collectionID !== undefined && {
        collectionID: toUUID(input.collectionID)
      })
    })
    .sort({ order: -1 });

  if (!input.lastOrder) {
    cursor.skip((page - 1) * perPage);
  }

  const entries = await cursor.limit(perPage).toArray();

  return entries.map((entry) => {
    return {
      id: toEntryID(entry._id),
      name: entry.name,
      order: entry.order,
      collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
    };
  });
};

export { listEntries };
