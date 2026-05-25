import { db, fromObjectID, UnderscoreID } from "#backend/lib/mongo";
import { Static, t } from "elysia";
import { ObjectId } from "mongodb";

const entryType = t.Object({
  id: t.String({ description: "ID of the entry" }),
  name: t.String({ description: "Name of the entry" }),
  order: t.String({ description: "LexoRank order of the entry" })
});

interface Entry<ID extends string | ObjectId = string>
  extends Omit<Static<typeof entryType>, "id"> {
  id: ID;
}
interface FullEntry<ID extends string | ObjectId = string> extends Entry<ID> {
  workspaceID: ID;
}

const entryID = (id: ObjectId) => fromObjectID(id, "ent");
const entriesDB = db.collection<UnderscoreID<FullEntry<ObjectId>>>("entries");

await entriesDB.createIndex({ workspaceId: 1 });

export { entryType, entriesDB, entryID };
export type { Entry, FullEntry };
