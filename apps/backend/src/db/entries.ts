import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
import * as z from "zod";

const entryType = z.object({
  id: id().describe("ID of the entry"),
  name: z.string().describe("Name of the entry"),
  order: z.string().describe("LexoRank order of the entry"),
  collectionID: id().optional().describe("ID of the collection this entry belongs to")
});

interface Entry<ID extends string | UUID = string> extends Omit<
  z.infer<typeof entryType>,
  "id" | "collectionID"
> {
  id: ID;
  collectionID?: ID;
}
interface FullEntry<ID extends string | UUID = string> extends Entry<ID> {
  workspaceID: ID;
}

const toEntryID = (id: UUID) => fromUUID(id, "ent");
const entriesDB = db.collection<UnderscoreID<FullEntry<UUID>>>("entries");

await entriesDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { entryType, entriesDB, toEntryID };
export type { Entry, FullEntry };
