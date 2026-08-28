import {
  entries,
  memberships,
  roles,
  type Permission,
  type Workspace,
  workspaces
} from "#backend/db";
import {
  toCollectionID,
  toEntryID,
  toMembershipID,
  toRoleID,
  toUserID,
  toUUID,
  toWorkspaceID
} from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { loadAuthorizedCollectionTree, type SessionData } from "#backend/lib/policy";
import { and, eq, inArray, isNull } from "drizzle-orm";

interface WorkspaceListItem extends Pick<Workspace, "id" | "name"> {
  userID: string;
  currentEntryID?: string;
  permissions: Permission[];
  admin: boolean;
  subscriptionPlan: string;
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
      membershipID: memberships.id,
      currentEntryID: entries.id,
      currentEntryCollectionID: entries.collectionID,
      permissions: roles.permissions,
      roleID: roles.id,
      baseRole: roles.baseRole,
      subscriptionPlan: workspaces.subscriptionPlan
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

  const availableRows = rows.filter((row) => {
    return row.baseRole === "admin" || row.subscriptionPlan === "pro";
  });
  const items = await Promise.all(
    availableRows.map(async (row): Promise<WorkspaceListItem> => {
      const auth: SessionData = {
        id: `workspace-list:${row.membershipID}`,
        type: "session",
        workspaceID: toWorkspaceID(row.id),
        subscriptionPlan: row.subscriptionPlan,
        session: {
          admin: row.baseRole === "admin",
          memberID: toMembershipID(row.membershipID),
          permissions: row.permissions,
          roleID: toRoleID(row.roleID),
          userID: toUserID(row.userID)
        }
      };
      let currentEntryID: string | undefined;

      if (row.currentEntryID) {
        const authorization = await loadAuthorizedCollectionTree({ auth });
        const collectionID = row.currentEntryCollectionID
          ? toCollectionID(row.currentEntryCollectionID)
          : null;

        if (authorization.canEntry(collectionID, "entry:read")) {
          currentEntryID = toEntryID(row.currentEntryID);
        }
      }

      return {
        id: toWorkspaceID(row.id),
        name: row.name,
        userID: toUserID(row.userID),
        currentEntryID,
        permissions: row.permissions,
        admin: row.baseRole === "admin",
        subscriptionPlan: row.subscriptionPlan
      };
    })
  );

  items.sort(
    (a, b) => Number(b.userID === input.activeUserID) - Number(a.userID === input.activeUserID)
  );

  return { workspaces: items };
};

export { listWorkspaces };
