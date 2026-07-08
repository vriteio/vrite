import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
import * as z from "zod";

const collectionType = z.object({
  id: id().describe("ID of the collection"),
  name: z.string().describe("Name of the collection"),
  ancestors: z.array(
    id().describe("IDs of the ancestor collections - from furthest to closest")
  ),
  descendants: z.array(id().describe("IDs of the directly-descendant collections"))
});

interface Collection<ID extends string | UUID = string> extends Omit<
  z.infer<typeof collectionType>,
  "id" | "descendants" | "ancestors"
> {
  id: ID;
  descendants: ID[];
  ancestors: ID[];
}

interface FullCollection<ID extends string | UUID = string> extends Collection<ID> {
  workspaceID: ID;
}

const toCollectionID = (id: UUID) => fromUUID(id, "coll");
const collectionsDB = db.collection<UnderscoreID<FullCollection<UUID>>>("collections");

await collectionsDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { collectionType, collectionsDB, toCollectionID };
export type { Collection, FullCollection };
