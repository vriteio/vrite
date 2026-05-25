import { db, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId, Binary } from "mongodb";

interface Content<ID extends string | ObjectId = string> {
  id: ID;
  entryID: ID;
  content?: Binary;
}
interface FullContent<ID extends string | ObjectId = string> extends Content<ID> {
  workspaceID: ID;
}

const contentsDB = db.collection<UnderscoreID<FullContent<ObjectId>>>("contents");

await contentsDB.createIndex(
  { entryID: 1, workspaceId: 1 },
  { unique: true, name: "entryID_1_workspaceID_1" }
);
await contentsDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { contentsDB };
export type { Content, FullContent };
