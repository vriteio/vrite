import {
  toInviteID,
  toMembershipID,
  toRoleID,
  toUUID,
  toWorkspaceID
} from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { type Invite, invitations } from "#backend/db";
import { createInviteLink } from "#backend/lib/messaging";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq, gt, lt } from "drizzle-orm";

interface InviteDetails extends Invite {
  inviteLink: string;
  workspaceID: string;
  invitedBy?: string;
}

const listInvitesOperation = async (input: {
  workspaceID: string;
}): Promise<{ invites: InviteDetails[] }> => {
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

  return {
    invites: rows.map((invite) => {
      const id = toInviteID(invite.id);

      return {
        id,
        email: invite.email,
        inviteLink: createInviteLink({ id, expiresAt: invite.expiresAt }),
        workspaceID: toWorkspaceID(workspaceID),
        roleID: toRoleID(invite.roleID),
        invitedBy: invite.invitedBy ? toMembershipID(invite.invitedBy) : undefined,
        status: invite.status,
        createdAt: invite.createdAt.toISOString(),
        expiresAt: invite.expiresAt.toISOString()
      };
    })
  };
};
const listInvites = withAuthorization<
  Record<never, never>,
  undefined,
  { invites: InviteDetails[] }
>(
  { permissions: { session: ["workspace"], key: ["memberships"] }, plan: "pro" },
  async ({ workspaceID }) => listInvitesOperation({ workspaceID })
);

export { listInvites };
export type { InviteDetails };
