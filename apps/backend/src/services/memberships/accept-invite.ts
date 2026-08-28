import { toMembershipID, toRoleID, toUUID, toUserID, toWorkspaceID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import {
  groupInvitations,
  groupMembers,
  invitations,
  memberships,
  users,
  workspaces
} from "#backend/db";
import { verifyInviteLink } from "#backend/lib/messaging";
import { loadGroupMembersUpdates } from "#backend/lib/data";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const acceptInvite = async (input: {
  expires: number;
  id: string;
  signature: string;
  userID: string;
}) => {
  if (input.expires * 1000 <= Date.now()) {
    throw new ORPCError("INVITE_EXPIRED", {
      status: 400,
      message: "This invitation has expired"
    });
  }
  if (!verifyInviteLink(input)) {
    throw new ORPCError("INVITE_INVALID", { status: 400, message: "Invalid invitation link" });
  }

  const invitationID = toUUID(input.id);
  const userID = toUUID(input.userID);
  const result = await db.transaction(async (tx) => {
    const [inviteWorkspace] = await tx
      .select({ workspaceID: invitations.workspaceID })
      .from(invitations)
      .where(eq(invitations.id, invitationID));

    if (!inviteWorkspace) {
      throw new ORPCError("INVITE_INVALID", { status: 400, message: "Invalid invitation link" });
    }

    const [workspace] = await tx
      .select({
        id: workspaces.id,
        name: workspaces.name,
        subscriptionPlan: workspaces.subscriptionPlan
      })
      .from(workspaces)
      .where(eq(workspaces.id, inviteWorkspace.workspaceID))
      .for("update");
    const [invite] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationID))
      .for("update");
    const [user] = await tx.select().from(users).where(eq(users.id, userID));

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
    if (!invite) {
      throw new ORPCError("INVITE_INVALID", { status: 400, message: "Invalid invitation link" });
    }

    if (!user) throw new ORPCError("UNAUTHORIZED", { message: "User not found" });
    if (workspace.subscriptionPlan !== "pro") {
      throw new ORPCError("FORBIDDEN", {
        message: "This workspace must upgrade to Andesine Pro before you can accept the invite"
      });
    }
    if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
      throw new ORPCError("INVITE_ACCOUNT_MISMATCH", {
        status: 403,
        message: `This invite was sent to ${invite.email}. Sign in with that account to accept it.`
      });
    }
    if (invite.status === "accepted") {
      throw new ORPCError("INVITE_ALREADY_ACCEPTED", {
        data: { workspaceID: toWorkspaceID(invite.workspaceID) },
        status: 409,
        message: "This invitation has already been accepted"
      });
    }
    if (invite.status === "expired" || invite.expiresAt <= new Date()) {
      if (invite.status !== "expired") {
        await tx
          .update(invitations)
          .set({ status: "expired" })
          .where(eq(invitations.id, invite.id));
      }
      throw new ORPCError("INVITE_EXPIRED", {
        status: 400,
        message: "This invitation has expired"
      });
    }

    await tx
      .insert(memberships)
      .values({
        userID,
        workspaceID: invite.workspaceID,
        roleID: invite.roleID
      })
      .onConflictDoNothing({
        target: [memberships.workspaceID, memberships.userID]
      });
    const [membership] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.userID, userID), eq(memberships.workspaceID, invite.workspaceID)));
    const invitationGroups = await tx
      .select({ groupID: groupInvitations.groupID })
      .from(groupInvitations)
      .where(
        and(
          eq(groupInvitations.workspaceID, invite.workspaceID),
          eq(groupInvitations.invitationID, invite.id)
        )
      );

    if (invitationGroups.length > 0) {
      await tx
        .insert(groupMembers)
        .values(
          invitationGroups.map(({ groupID }) => ({
            groupID,
            membershipID: membership.id,
            workspaceID: invite.workspaceID
          }))
        )
        .onConflictDoNothing();
      await tx
        .delete(groupInvitations)
        .where(
          and(
            eq(groupInvitations.workspaceID, invite.workspaceID),
            eq(groupInvitations.invitationID, invite.id)
          )
        );
    }

    await tx.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, invite.id));
    await tx
      .update(users)
      .set({ currentWorkspaceID: invite.workspaceID, updatedAt: new Date() })
      .where(eq(users.id, userID));

    const updatedGroups = await loadGroupMembersUpdates(
      tx,
      invite.workspaceID,
      invitationGroups.map(({ groupID }) => groupID)
    );

    return { workspace, membership, updatedGroups };
  });

  return {
    workspaceID: toWorkspaceID(result.workspace.id),
    workspaceName: result.workspace.name,
    updatedGroups: result.updatedGroups,
    membership: {
      id: toMembershipID(result.membership.id),
      userID: toUserID(result.membership.userID),
      roleID: toRoleID(result.membership.roleID)
    }
  };
};

export { acceptInvite };
