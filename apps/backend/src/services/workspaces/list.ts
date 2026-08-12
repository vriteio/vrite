import {
  entries,
  memberships,
  roles,
  type Permission,
  type Workspace,
  workspaces
} from "#backend/db";
import { toEntryID, toUserID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { and, eq, inArray, isNull } from "drizzle-orm";

interface WorkspaceListItem extends Pick<Workspace, "id" | "name"> {
  userID: string;
  currentEntryID?: string;
  permissions: Permission[];
  admin: boolean;
}

const listWorkspaces = async (input: {
  activeUserID: string;
  userIDs: string[];
}): Promise<{ workspaces: WorkspaceListItem[] }> => {
  const userIDs = input.userIDs.map(toUUID);

  if (userIDs.length === 0) return { workspaces: [] };

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      userID: memberships.userID,
      currentEntryID: entries.id,
      permissions: roles.permissions,
      baseRole: roles.baseRole
    })
    .from(memberships)
    .innerJoin(workspaces, eq(workspaces.id, memberships.workspaceID))
    .innerJoin(roles, eq(roles.id, memberships.roleID))
    .leftJoin(
      entries,
      and(
        eq(entries.id, memberships.currentEntryID),
        eq(entries.workspaceID, memberships.workspaceID),
        isNull(entries.deletedAt)
      )
    )
    .where(inArray(memberships.userID, userIDs));

  return {
    workspaces: rows
      .map((row): WorkspaceListItem => ({
        id: toWorkspaceID(row.id),
        name: row.name,
        userID: toUserID(row.userID),
        currentEntryID: row.currentEntryID ? toEntryID(row.currentEntryID) : undefined,
        permissions: row.permissions,
        admin: row.baseRole === "admin"
      }))
      .sort(
        (a, b) => Number(b.userID === input.activeUserID) - Number(a.userID === input.activeUserID)
      )
  };
};

export { listWorkspaces };
