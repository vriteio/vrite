import { contentsDB, entriesDB, Entry, toEntryID, FullContent, FullEntry } from "#backend/db";
import { generateUUID, toUUID, UnderscoreID } from "#backend/lib/mongo";
import { toCollectionID } from "#backend/db/collections";
import { LexoRank } from "lexorank";
import type { UUID } from "#backend/lib/mongo";

const createEntry = async (
  input: Partial<Entry> & {
    workspaceID: string;
  }
): Promise<Entry> => {
  const entry: UnderscoreID<FullEntry<UUID>> = {
    _id: input.id ? toUUID(input.id) : generateUUID(),
    name: input.name || "",
    order: `${LexoRank.min()}`,
    workspaceID: toUUID(input.workspaceID),
    collectionID: input.collectionID ? toUUID(input.collectionID) : undefined
  };
  const content: UnderscoreID<FullContent<UUID>> = {
    _id: generateUUID(),
    entryID: entry._id,
    workspaceID: entry.workspaceID
  };
  const [lastEntry] = await entriesDB.find().sort({ order: -1 }).limit(1).toArray();

  if (lastEntry) {
    entry.order = `${LexoRank.parse(lastEntry.order).genNext()}`;
  } else {
    entry.order = `${LexoRank.min()}`;
  }

  await entriesDB.insertOne(entry);
  await contentsDB.insertOne(content);

  return {
    ...entry,
    collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined,
    id: toEntryID(entry._id)
  };
};

export { createEntry };
