import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const collectionType = z.object({
  id: objectID().describe("ID of the collection"),
  name: z.string().describe("Name of the collection"),
  ancestors: z.array(
    objectID().describe("IDs of the ancestor collections - from furthest to closest")
  ),
  descendants: z.array(objectID().describe("IDs of the directly-descendant collections"))
});

interface Collection<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof collectionType>,
  "id" | "descendants" | "ancestors"
> {
  id: ID;
  descendants: ID[];
  ancestors: ID[];
}

interface FullCollection<ID extends string | ObjectId = string> extends Collection<ID> {
  workspaceID: ID;
}

const toCollectionID = (id: ObjectId) => fromObjectID(id, "coll");
const collectionsDB = db.collection<UnderscoreID<FullCollection<ObjectId>>>("collections");

await collectionsDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { collectionType, collectionsDB, toCollectionID };
export type { Collection, FullCollection };
