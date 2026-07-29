import { toInviteID, toMembershipID, toRoleID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { type Invite, invitations } from "#backend/db";
import { createInviteLink } from "#backend/lib/invites";
import { and, eq, gt, lt } from "drizzle-orm";

interface InviteDetails extends Invite {
  inviteLink: string;
  workspaceID: string;
  invitedBy?: string;
}

const listInvites = async (input: { workspaceID: string }): Promise<InviteDetails[]> => {
  const workspaceID = toUUID(input.workspaceID);
  await db
    .update(invitations)
    .set({ status: "expired" })
    .where(
      and(
        eq(invitations.workspaceID, workspaceID),
        eq(invitations.status, "pending"),
        lt(invitations.expiresAt, new Date())
      )
    );
  const rows = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.workspaceID, workspaceID),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date())
      )
    );

  return rows.map((invite) => {
    const id = toInviteID(invite.id);

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
