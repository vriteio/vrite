import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const membershipType = z.object({
  id: objectID().describe("ID of the membership"),
  userID: objectID().describe("ID of the user"),
  roleID: objectID().describe("ID of the role")
});

interface Membership<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof membershipType>,
  "id" | "userID" | "workspaceID" | "roleID"
> {
  id: ID;
  userID: ID;
  roleID: ID;
}
interface FullMembership<ID extends string | ObjectId = string> extends Membership<ID> {
  workspaceID: ID;
}

const toMembershipID = (id: ObjectId) => fromObjectID(id, "ms");
const membershipDB = db.collection<UnderscoreID<FullMembership<ObjectId>>>("memberships");

await membershipDB.createIndex(
  { userID: 1, workspaceID: 1 },
  { unique: true, name: "userID_1_workspaceID_1" }
);
await membershipDB.createIndex({ userID: 1 }, { name: "userID_1" });
await membershipDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });
await membershipDB.createIndex({ roleID: 1 }, { name: "roleID_1" });

export { membershipType, membershipDB, toMembershipID };
export type { Membership, FullMembership };
