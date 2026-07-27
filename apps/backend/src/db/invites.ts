import { db, fromUUID, id, UnderscoreID } from "#backend/lib/mongo";
import type { UUID } from "#backend/lib/mongo";
import * as z from "zod";

const inviteStatusType = z.enum(["pending", "accepted", "expired"]);
const inviteType = z.object({
  id: id().describe("ID of the invite"),
  email: z.email().max(320).describe("Email address of the invited user"),
  roleID: id().describe("ID of the role to assign"),
  invitedBy: id().optional().describe("ID of the member who created the invite"),
  status: inviteStatusType.describe("Current status of the invite"),
  createdAt: z.iso.datetime().describe("When the invite was created"),
  expiresAt: z.iso.datetime().describe("When the invite expires")
});

interface Invite<ID extends string | UUID = string> extends Omit<
  z.infer<typeof inviteType>,
  "id" | "roleID" | "invitedBy" | "createdAt" | "expiresAt"
> {
  id: ID;
  roleID: ID;
  invitedBy?: ID;
  createdAt: ID extends UUID ? Date : string;
  expiresAt: ID extends UUID ? Date : string;
}
interface FullInvite<ID extends string | UUID = string> extends Invite<ID> {
  workspaceID: ID;
}

const toInviteID = (id: UUID) => fromUUID(id, "inv");
const invitesDB = db.collection<UnderscoreID<FullInvite<UUID>>>("invites");

await invitesDB.createIndex({ workspaceID: 1 }, { name: "workspaceID_1" });
await invitesDB.createIndex(
  { email: 1, workspaceID: 1, status: 1 },
  { unique: true, name: "email_1_workspaceID_1_status_1" }
);
await invitesDB.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_1" });

export { inviteStatusType, inviteType, invitesDB, toInviteID };
export type { Invite, FullInvite };
