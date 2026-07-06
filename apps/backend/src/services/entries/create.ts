import { contentsDB, entriesDB, Entry, toEntryID, FullContent, FullEntry } from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { toCollectionID } from "#backend/db/collections";
import { LexoRank } from "lexorank";
import { ObjectId } from "mongodb";

const createEntry = async (
  input: Partial<Entry> & {
    workspaceID: string;
  }
): Promise<Entry> => {
  const entry: UnderscoreID<FullEntry<ObjectId>> = {
    _id: input.id ? toObjectID(input.id) : new ObjectId(),
    name: input.name || "",
    order: `${LexoRank.min()}`,
    workspaceID: toObjectID(input.workspaceID),
    collectionID: input.collectionID ? toObjectID(input.collectionID) : undefined
  };
  const content: UnderscoreID<FullContent<ObjectId>> = {
    _id: new ObjectId(),
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
