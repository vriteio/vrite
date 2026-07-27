import { invitesDB, toInviteID, toRoleID, toMembershipID, type Invite } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { createInviteLink } from "#backend/lib/invites";

interface InviteDetails extends Invite {
  inviteLink: string;
  workspaceID: string;
  invitedBy?: string;
}

const listInvites = async (input: { workspaceID: string }): Promise<InviteDetails[]> => {
  const workspaceUUID = toUUID(input.workspaceID);
  const invites = await invitesDB.find({ workspaceID: workspaceUUID, status: "pending" }).toArray();

  return invites.map((invite) => {
    const id = toInviteID(invite._id);

    return {
      id,
      email: invite.email,
      inviteLink: createInviteLink({ id, expiresAt: invite.expiresAt }),
      workspaceID: input.workspaceID,
      roleID: toRoleID(invite.roleID),
      invitedBy: invite.invitedBy ? toMembershipID(invite.invitedBy) : undefined,
      status: invite.status,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString()
    };
  });
};

export { listInvites };
export type { InviteDetails };
