import { entriesDB, Entry, entryID } from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const listEntries = async (input: {
  workspaceID: string;
  lastOrder?: string;
  perPage?: number;
  page?: number;
}): Promise<Entry[]> => {
  const perPage = input.perPage || 50;
  const page = input.page || 1;
  const cursor = entriesDB
    .find({
      workspaceID: toObjectID(input.workspaceID),
      ...(input.lastOrder && { order: { $lt: input.lastOrder } })
    })
    .sort({ order: -1 });

  if (!input.lastOrder) {
    cursor.skip((page - 1) * perPage);
  }

  const entries = await cursor.limit(perPage).toArray();

  return entries.map((entry) => {
    return {
      id: entryID(entry._id),
      name: entry.name,
      order: entry.order
    };
  });
};

export { listEntries };
