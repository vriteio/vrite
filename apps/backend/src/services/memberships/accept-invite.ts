import {
  invitesDB,
  membershipDB,
  toMembershipID,
  toRoleID,
  toUserID,
  toWorkspaceID,
  usersDB,
  workspacesDB
} from "#backend/db";
import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";

const acceptInvite = async (input: {
  token: string;
  userID: string;
}): Promise<{
  workspaceID: string;
  workspaceName: string;
  membership: { id: string; userID: string; roleID: string };
}> => {
  const tokenHash = createHash("sha256").update(input.token).digest("hex");

  const invite = await invitesDB.findOne({
    token: tokenHash,
    status: "pending"
  });

  if (!invite) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid or expired invite" });
  }

  // Check expiration
  if (invite.expiresAt < new Date()) {
    await invitesDB.updateOne({ _id: invite._id }, { $set: { status: "expired" } });

    throw new ORPCError("BAD_REQUEST", { message: "Invite has expired" });
  }

  const userID = new ObjectId(input.userID);
  const [workspace, user] = await Promise.all([
    workspacesDB.findOne({ _id: invite.workspaceID }),
    usersDB.findOne({ _id: userID })
  ]);

  if (!workspace) {
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
  }

  if (!user) {
    throw new ORPCError("UNAUTHORIZED", { message: "User not found" });
  }

  if ((user.email || "").trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
    throw new ORPCError("FORBIDDEN", {
      message: `This invite was sent to ${invite.email}. Sign in with that account to accept it.`
    });
  }

  // Check if user already has a membership in this workspace
  const existingMembership = await membershipDB.findOne({
    userID,
    workspaceID: invite.workspaceID
  });

  if (existingMembership) {
    // Mark invite as accepted but don't create duplicate membership
    await Promise.all([
      invitesDB.updateOne({ _id: invite._id }, { $set: { status: "accepted" } }),
      usersDB.updateOne({ _id: userID }, { $set: { currentWorkspaceID: invite.workspaceID } })
    ]);

    await Auth.invalidateSessionData({
      userID: input.userID,
      workspaceID: toWorkspaceID(workspace._id)
    });

    return {
      workspaceID: toWorkspaceID(workspace._id),
      workspaceName: workspace.name,
      membership: {
        id: toMembershipID(existingMembership._id),
        userID: toUserID(existingMembership.userID),
        roleID: toRoleID(existingMembership.roleID)
      }
    };
  }

  // Create membership
  const membershipID = new ObjectId();
  await membershipDB.insertOne({
    _id: membershipID,
    userID,
    workspaceID: invite.workspaceID,
    roleID: invite.roleID
  });

  // Mark invite as accepted
  await invitesDB.updateOne({ _id: invite._id }, { $set: { status: "accepted" } });

  // Update user's current workspace
  await usersDB.updateOne({ _id: userID }, { $set: { currentWorkspaceID: invite.workspaceID } });

  await Auth.invalidateSessionData({
    userID: input.userID,
    workspaceID: toWorkspaceID(workspace._id)
  });

  return {
    workspaceID: toWorkspaceID(workspace._id),
    workspaceName: workspace.name,
    membership: {
      id: toMembershipID(membershipID),
      userID: toUserID(userID),
      roleID: toRoleID(invite.roleID)
    }
  };
};

export { acceptInvite };
