import { db, UnderscoreID } from "#backend/lib/mongo";
import { Binary } from "mongodb";
import type { UUID } from "#backend/lib/mongo";

interface Content<ID extends string | UUID = string> {
  id: ID;
  entryID: ID;
  content?: Binary;
}
interface FullContent<ID extends string | UUID = string> extends Content<ID> {
  workspaceID: ID;
}

const contentsDB = db.collection<UnderscoreID<FullContent<UUID>>>("contents");

await contentsDB.createIndex(
  { entryID: 1, workspaceId: 1 },
  { unique: true, name: "entryID_1_workspaceID_1" }
);
await contentsDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });

export { contentsDB };
export type { Content, FullContent };
