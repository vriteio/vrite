import {
  collectionsDB,
  Collection,
  toCollectionID,
  entriesDB,
  Entry,
  toEntryID
} from "#backend/db";
import { toObjectID } from "#backend/lib/mongo";

const getExplorerTree = async (input: {
  workspaceID: string;
}): Promise<{ collections: Collection[]; entries: Entry[] }> => {
  const workspaceID = toObjectID(input.workspaceID);
  const [rawCollections, rawEntries] = await Promise.all([
    collectionsDB.find({ workspaceID }).toArray(),
    entriesDB.find({ workspaceID }).sort({ order: -1 }).toArray()
  ]);

  const collections: Collection[] = rawCollections.map((collection) => ({
    id: toCollectionID(collection._id),
    name: collection.name,
    ancestors: collection.ancestors.map((id) => toCollectionID(id)),
    descendants: collection.descendants.map((id) => toCollectionID(id))
  }));

  const entries: Entry[] = rawEntries.map((entry) => ({
    id: toEntryID(entry._id),
    name: entry.name,
    order: entry.order,
    collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : undefined
  }));

  return { collections, entries };
};

export { getExplorerTree };
