import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
import * as z from "zod";

const membershipType = z.object({
  id: id().describe("ID of the membership"),
  userID: id().describe("ID of the user"),
  roleID: id().describe("ID of the role")
});

interface Membership<ID extends string | UUID = string> extends Omit<
  z.infer<typeof membershipType>,
  "id" | "userID" | "workspaceID" | "roleID"
> {
  id: ID;
  userID: ID;
  roleID: ID;
}
interface FullMembership<ID extends string | UUID = string> extends Membership<ID> {
  workspaceID: ID;
}

const toMembershipID = (id: UUID) => fromUUID(id, "ms");
const membershipDB = db.collection<UnderscoreID<FullMembership<UUID>>>("memberships");

await membershipDB.createIndex(
  { userID: 1, workspaceID: 1 },
  { unique: true, name: "userID_1_workspaceID_1" }
);
await membershipDB.createIndex({ userID: 1 }, { name: "userID_1" });
await membershipDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });
await membershipDB.createIndex({ roleID: 1 }, { name: "roleID_1" });

export { membershipType, membershipDB, toMembershipID };
export type { Membership, FullMembership };
