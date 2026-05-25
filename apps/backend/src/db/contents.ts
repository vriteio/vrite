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

await contentsDB.createIndex({ contentPieceId: 1 });
await contentsDB.createIndex({ workspaceId: 1 });

export { contentsDB };
export type { Content, FullContent };
