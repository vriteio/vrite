import {
  membershipDB,
  rolesDB,
  toUserID,
  workspacesDB,
  toWorkspaceID,
  toRoleID,
  Workspace,
  Permission
} from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

interface WorkspaceListItem extends Pick<Workspace, "id" | "name"> {
  userID: string;
  permissions: Permission[];
  admin: boolean;
}

const listWorkspaces = async (input: { activeUserID: string; userIDs: string[] }) => {
  const userIDs = input.userIDs.map((id) => toUUID(id));
  const memberships = await membershipDB.find({ userID: { $in: userIDs } }).toArray();

  if (memberships.length === 0) return [];

  const workspaceIDs = memberships.map((membership) => membership.workspaceID);
  const roleIDs = memberships.map((membership) => membership.roleID);
  const [workspaces, roles] = await Promise.all([
    workspacesDB.find({ _id: { $in: workspaceIDs } }).toArray(),
    rolesDB.find({ _id: { $in: roleIDs } }).toArray()
  ]);
  const workspaceMap = new Map(
    workspaces.map((workspace) => {
      return [toWorkspaceID(workspace._id), workspace];
    })
  );
  const roleMap = new Map(roles.map((role) => [toRoleID(role._id), role]));

  return memberships
    .map((membership) => {
      const workspace = workspaceMap.get(toWorkspaceID(membership.workspaceID));
      const role = roleMap.get(toRoleID(membership.roleID));

      if (!workspace || !role) return null;

      return {
        id: toWorkspaceID(workspace._id),
        name: workspace.name,
        userID: toUserID(membership.userID),
        permissions: role.permissions,
        admin: role.baseRole === "admin"
      };
    })
    .filter((workspace): workspace is WorkspaceListItem => {
      return workspace !== null;
    })
    .sort((workspaceA, workspaceB) => {
      // Sort workspaces so that the active user's workspace appears first
      return (
        Number(workspaceB.userID === input.activeUserID) -
        Number(workspaceA.userID === input.activeUserID)
      );
    });
};

export { listWorkspaces };
