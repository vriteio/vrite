import { invitesDB, toInviteID, toRoleID, toMembershipID, type Invite } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

interface InviteDetails extends Invite {
  workspaceID: string;
  invitedBy?: string;
}

const listInvites = async (input: { workspaceID: string }): Promise<InviteDetails[]> => {
  const workspaceUUID = toUUID(input.workspaceID);
  const invites = await invitesDB.find({ workspaceID: workspaceUUID, status: "pending" }).toArray();

  return invites.map((inv) => ({
    id: toInviteID(inv._id),
    email: inv.email,
    workspaceID: input.workspaceID,
    roleID: toRoleID(inv.roleID),
    invitedBy: inv.invitedBy ? toMembershipID(inv.invitedBy) : undefined,
    status: inv.status,
    createdAt: inv.createdAt.toISOString(),
    expiresAt: inv.expiresAt.toISOString()
  }));
};

export { listInvites };
export type { InviteDetails };
