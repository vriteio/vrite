import { toMembershipID, toRoleID, toUUID, toUserID, toWorkspaceID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { invitations, memberships, users, workspaces } from "#backend/db";
import { verifyInviteLink } from "#backend/lib/invites";
import { Auth } from "#backend/services/auth";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const acceptInvite = async (input: {
  expires: number;
  id: string;
  signature: string;
  userID: string;
}) => {
  if (!verifyInviteLink(input)) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid or expired invite" });
  }

  const userID = toUUID(input.userID);
  const result = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invitations)
      .where(and(eq(invitations.id, toUUID(input.id)), eq(invitations.status, "pending")))
      .for("update");

    if (!invite || invite.expiresAt <= new Date()) {
      if (invite) {
        await tx
          .update(invitations)
          .set({ status: "expired" })
          .where(eq(invitations.id, invite.id));
      }
      throw new ORPCError("BAD_REQUEST", { message: "Invalid or expired invite" });
    }

    const [workspace] = await tx
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceID));
    const [user] = await tx.select().from(users).where(eq(users.id, userID));

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
    if (!user) throw new ORPCError("UNAUTHORIZED", { message: "User not found" });
    if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
      throw new ORPCError("FORBIDDEN", {
        message: `This invite was sent to ${invite.email}. Sign in with that account to accept it.`
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

    await tx.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, invite.id));
    await tx
      .update(users)
      .set({ currentWorkspaceID: invite.workspaceID, updatedAt: new Date() })
      .where(eq(users.id, userID));

    return { workspace, membership };
  });

  await Auth.invalidateSessionData({
    userID: input.userID,
    workspaceID: toWorkspaceID(result.workspace.id)
  });

  return {
    workspaceID: toWorkspaceID(result.workspace.id),
    workspaceName: result.workspace.name,
    membership: {
      id: toMembershipID(result.membership.id),
      userID: toUserID(result.membership.userID),
      roleID: toRoleID(result.membership.roleID)
    }
  };
};

export { acceptInvite };
