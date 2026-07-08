import {
  invitesDB,
  toInviteID,
  membershipDB,
  rolesDB,
  usersDB,
  workspacesDB,
  type FullInvite
} from "#backend/db";
import { generateUUID, toUUID, type UnderscoreID } from "#backend/lib/mongo";
import { generateInviteToken } from "#backend/lib/utils";
import { sendEmail } from "#backend/lib/email";
import { config } from "#backend/lib/config";
import type { UUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const inviteMember = async (input: {
  workspaceID: string;
  email: string;
  roleID: string;
  inviterID?: string;
}): Promise<{
  inviteID: string;
  inviteLink: string;
  emailDelivery: "sent" | "manual" | "failed";
  invite: {
    id: string;
    email: string;
    roleID: string;
    invitedBy?: string;
    status: "pending" | "accepted" | "expired";
    createdAt: string;
    expiresAt: string;
  };
}> => {
  const workspaceID = toUUID(input.workspaceID);
  const roleUUID = toUUID(input.roleID);
  const normalizedEmail = input.email.trim().toLowerCase();

  const [role, workspace, invitedUser] = await Promise.all([
    rolesDB.findOne({ _id: roleUUID, workspaceID }),
    workspacesDB.findOne({ _id: workspaceID }),
    usersDB.findOne({ email: normalizedEmail })
  ]);

  if (!role) {
    throw new ORPCError("BAD_REQUEST", { message: "Role not found" });
  }

  if (!workspace) {
    throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });
  }

  if (invitedUser) {
    const existingMember = await membershipDB.findOne({
      workspaceID,
      userID: invitedUser._id
    });

    if (existingMember) {
      throw new ORPCError("BAD_REQUEST", {
        message: "This user is already a member of the workspace"
      });
    }
  }

  // Check for existing pending invite
  const existingInvite = await invitesDB.findOne({
    email: normalizedEmail,
    workspaceID,
    status: "pending"
  });

  if (existingInvite) {
    throw new ORPCError("BAD_REQUEST", {
      message: "An invite has already been sent to this email"
    });
  }

  const { raw, hash } = generateInviteToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite: UnderscoreID<FullInvite<UUID>> = {
    _id: generateUUID(),
    workspaceID,
    email: normalizedEmail,
    roleID: roleUUID,
    ...(input.inviterID && { invitedBy: toUUID(input.inviterID) }),
    token: hash,
    status: "pending",
    createdAt: now,
    expiresAt
  };

  await invitesDB.insertOne(invite);

  const inviteLink = `${config.PUBLIC_APP_URL}/invite?token=${raw}`;
  let inviterName = "Someone";

  if (input.inviterID) {
    const inviterMembership = await membershipDB.findOne({ _id: toUUID(input.inviterID) });

    if (inviterMembership) {
      const inviter = await usersDB.findOne({ _id: inviterMembership.userID });

      inviterName = inviter?.name || inviter?.email || inviterName;
    }
  }

  let emailDelivery: "sent" | "manual" | "failed" = "sent";

  try {
    const delivery = await sendEmail(normalizedEmail, "workspace-invite", {
      workspaceName: workspace.name,
      inviterName,
      inviteLink
    });

    emailDelivery = delivery.status;
  } catch (error) {
    console.error("Failed to deliver workspace invite email", {
      inviteID: toInviteID(invite._id),
      workspaceID: input.workspaceID,
      email: normalizedEmail,
      error
    });
    emailDelivery = "failed";
  }

  return {
    inviteID: toInviteID(invite._id),
    inviteLink,
    emailDelivery,
    invite: {
      id: toInviteID(invite._id),
      email: invite.email,
      roleID: input.roleID,
      invitedBy: input.inviterID,
      status: invite.status,
      createdAt: invite.createdAt.toISOString(),
      expiresAt: invite.expiresAt.toISOString()
    }
  };
};

export { inviteMember };
