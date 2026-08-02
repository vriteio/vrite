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
  if (input.expires * 1000 <= Date.now()) {
    throw new ORPCError("INVITE_EXPIRED", {
      status: 400,
      message: "This invitation has expired"
    });
  }
  if (!verifyInviteLink(input)) {
    throw new ORPCError("INVITE_INVALID", { status: 400, message: "Invalid invitation link" });
  }

  const userID = toUUID(input.userID);
  const result = await db.transaction(async (tx) => {
    const [invite] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.id, toUUID(input.id)))
      .for("update");

    if (!invite) {
      throw new ORPCError("INVITE_INVALID", { status: 400, message: "Invalid invitation link" });
    }

    const [workspace] = await tx
      .select({ id: workspaces.id, name: workspaces.name })
      .from(workspaces)
      .where(eq(workspaces.id, invite.workspaceID));
    const [user] = await tx.select().from(users).where(eq(users.id, userID));

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
    if (!user) throw new ORPCError("UNAUTHORIZED", { message: "User not found" });
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
