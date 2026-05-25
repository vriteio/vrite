import {
  membershipDB,
  roleID,
  rolesDB,
  userID,
  usersDB,
  workspaceID,
  workspacesDB
} from "#backend/db";
import { status } from "elysia";
import { toObjectID } from "#backend/lib/mongo";

interface SessionData {
  workspaceID: string;
  userID: string;
  roleID?: string;
  permissions?: string[];
  admin?: boolean;
  subscriptionPlan?: string;
}

const getSessionData = async (input: {
  userID: string;
  workspaceID?: string;
}): Promise<SessionData> => {
  const user = await usersDB.findOne({
    _id: toObjectID(input.userID)
  });

  if (!user) throw status("Not Found");

  const inputWorkspaceID = input.workspaceID || user.currentWorkspaceID;
  const membership = await membershipDB.findOne({
    userID: toObjectID(input.userID),
    ...(inputWorkspaceID && { workspaceID: toObjectID(inputWorkspaceID) })
  });

  if (!membership) throw status("Not Found");

  const workspace = await workspacesDB.findOne({
    _id: membership.workspaceID
  });

  if (!workspace) throw status("Not Found");

  const role = membership.roleID
    ? await rolesDB.findOne({
        _id: membership.roleID
      })
    : null;

  return {
    workspaceID: workspaceID(workspace._id),
    userID: userID(user._id),
    roleID: role?._id ? roleID(role._id) : undefined,
    permissions: role?.permissions,
    admin: membership.admin,
    subscriptionPlan: workspace.subscriptionPlan
  };
};

export { getSessionData };
export type { SessionData };
