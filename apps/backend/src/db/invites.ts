import { db, fromObjectID, objectID, UnderscoreID } from "#backend/lib/mongo";
import { ObjectId } from "mongodb";
import * as z from "zod";

const inviteStatusType = z.enum(["pending", "accepted", "expired"]);
const inviteType = z.object({
  id: objectID().describe("ID of the invite"),
  email: z.email().max(320).describe("Email address of the invited user"),
  roleID: objectID().describe("ID of the role to assign"),
  invitedBy: objectID().optional().describe("ID of the member who created the invite"),
  status: inviteStatusType.describe("Current status of the invite"),
  createdAt: z.iso.datetime().describe("When the invite was created"),
  expiresAt: z.iso.datetime().describe("When the invite expires")
});

interface Invite<ID extends string | ObjectId = string> extends Omit<
  z.infer<typeof inviteType>,
  "id" | "roleID" | "invitedBy" | "createdAt" | "expiresAt"
> {
  id: ID;
  roleID: ID;
  invitedBy?: ID;
  createdAt: ID extends string ? string : Date;
  expiresAt: ID extends string ? string : Date;
}
interface FullInvite<ID extends string | ObjectId = string> extends Invite<ID> {
  workspaceID: ID;
  token: string;
}

const toInviteID = (id: ObjectId) => fromObjectID(id, "inv");
const invitesDB = db.collection<UnderscoreID<FullInvite<ObjectId>>>("invites");

await invitesDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });
await invitesDB.createIndex(
  { email: 1, workspaceID: 1, status: 1 },
  { unique: true, name: "email_1_workspaceID_1_status_1" }
);
await invitesDB.createIndex({ token: 1 }, { unique: true, name: "token_1" });
await invitesDB.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_1" });

export { inviteStatusType, inviteType, invitesDB, toInviteID };
export type { Invite, FullInvite };
