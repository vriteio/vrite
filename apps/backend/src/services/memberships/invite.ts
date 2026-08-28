import { toInviteID, toMembershipID, toRoleID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { invitations, memberships, roles, users, workspaces } from "#backend/db";
import { deliverInvite } from "#backend/lib/messaging";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq, lt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

interface InviteMemberInput {
  email: string;
  roleID: string;
  inviterID?: string;
}

const inviteMemberOperation = async (input: InviteMemberInput & { workspaceID: string }) => {
  const workspaceID = toUUID(input.workspaceID);
  const roleID = toUUID(input.roleID);
  const normalizedEmail = input.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const result = await db.transaction(async (tx) => {
    await tx
      .update(invitations)
      .set({ status: "expired" })
      .where(
        and(
          eq(invitations.workspaceID, workspaceID),
          eq(invitations.status, "pending"),
          lt(invitations.expiresAt, new Date())
        )
      );
    const [role] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleID), eq(roles.workspaceID, workspaceID)));
    const [workspace] = await tx
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID));

    if (!role) throw new ORPCError("BAD_REQUEST", { message: "Role not found" });
    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [existingUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingUser) {
      const [existingMember] = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(eq(memberships.workspaceID, workspaceID), eq(memberships.userID, existingUser.id))
        );

      if (existingMember) {
        throw new ORPCError("MEMBERSHIP_ALREADY_EXISTS", {
          status: 409,
          message: "This user is already a member of the workspace"
        });
      }
    }

    const [existingInvite] = await tx
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.workspaceID, workspaceID),
          eq(invitations.email, normalizedEmail),
          eq(invitations.status, "pending")
        )
      );

    if (existingInvite) {
      throw new ORPCError("INVITE_ALREADY_PENDING", {
        status: 409,
        message: "An invite has already been sent to this email"
      });
    }

    const [invite] = await tx
      .insert(invitations)
      .values({
        workspaceID,
        email: normalizedEmail,
        roleID,
        invitedBy: input.inviterID ? toUUID(input.inviterID) : null,
        expiresAt
      })
      .returning();

    return { invite, workspaceName: workspace.name };
  });
  const { emailDelivery, inviteLink } = await deliverInvite({
    invite: result.invite,
    workspaceName: result.workspaceName
  });

  return {
    inviteID: toInviteID(result.invite.id),
    inviteLink,
    emailDelivery,
    invite: {
      id: toInviteID(result.invite.id),
      email: result.invite.email,
      roleID: toRoleID(result.invite.roleID),
      invitedBy: result.invite.invitedBy ? toMembershipID(result.invite.invitedBy) : undefined,
      status: result.invite.status,
      createdAt: result.invite.createdAt.toISOString(),
      expiresAt: result.invite.expiresAt.toISOString()
    }
  };
};
const inviteMember = withAuthorization<
  Omit<InviteMemberInput, "inviterID">,
  undefined,
  Awaited<ReturnType<typeof inviteMemberOperation>>
>(
  { permissions: { session: ["workspace"], key: ["memberships"] }, plan: "pro" },
  async ({ auth, input, workspaceID }) => {
    return inviteMemberOperation({ ...input, inviterID: auth.session?.memberID, workspaceID });
  }
);

export { inviteMember };
