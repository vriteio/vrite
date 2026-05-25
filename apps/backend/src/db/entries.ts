import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const entryType = z.object({
  id: objectID().describe("ID of the entry"),
  name: z.string().describe("Name of the entry"),
  order: z.string().describe("LexoRank order of the entry"),
  collectionID: objectID().optional().describe("ID of the collection this entry belongs to")
});

interface Entry<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof entryType>,
  "id" | "collectionID"
> {
  id: ID;
  collectionID?: ID;
}
interface FullEntry<ID extends string | ObjectId = string> extends Entry<ID> {
  workspaceID: ID;
}

const toEntryID = (id: ObjectId) => fromObjectID(id, "ent");
const entriesDB = db.collection<UnderscoreID<FullEntry<ObjectId>>>("entries");

await entriesDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { entryType, entriesDB, toEntryID };
export type { Entry, FullEntry };
