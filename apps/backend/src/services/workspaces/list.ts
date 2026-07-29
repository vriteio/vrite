import { memberships, roles, type Permission, type Workspace, workspaces } from "#backend/db";
import { toUserID, toUUID, toWorkspaceID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { eq, inArray } from "drizzle-orm";

interface WorkspaceListItem extends Pick<Workspace, "id" | "name"> {
  userID: string;
  permissions: Permission[];
  admin: boolean;
}

const listWorkspaces = async (input: { activeUserID: string; userIDs: string[] }) => {
  const userIDs = input.userIDs.map(toUUID);

  if (userIDs.length === 0) return [];

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      userID: memberships.userID,
      permissions: roles.permissions,
      baseRole: roles.baseRole
    })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceID))
    .innerJoin(roles, eq(roles.id, memberships.roleID))
    .where(inArray(memberships.userID, userIDs));

  return rows
    .map(
      (row): WorkspaceListItem => ({
        id: toWorkspaceID(row.id),
        name: row.name,
        userID: toUserID(row.userID),
        permissions: row.permissions,
        admin: row.baseRole === "admin"
      })
    )
    .sort(
      (a, b) => Number(b.userID === input.activeUserID) - Number(a.userID === input.activeUserID)
    );
};

export { listWorkspaces };
