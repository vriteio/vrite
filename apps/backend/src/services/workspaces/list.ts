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
  toUserID,
  toUUID,
  toWorkspaceID
} from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { loadCollectionTree } from "#backend/lib/data";
import { hasPermission } from "#backend/lib/policy";
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
  const treeByWorkspaceID = new Map<string, ReturnType<typeof loadCollectionTree>>();

  if (userIDs.length === 0) return { workspaces: [] };

  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      userID: memberships.userID,
      currentEntryID: entries.id,
      currentEntryCollectionID: entries.collectionID,
      permissions: roles.permissions,
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
      const canReadRestricted =
        row.baseRole === "admin" ||
        row.permissions.some((permission) => {
          return hasPermission(permission, "read:restricted_collections");
        });
      let currentEntryID = row.currentEntryID;

      if (currentEntryID && row.currentEntryCollectionID && !canReadRestricted) {
        let treePromise = treeByWorkspaceID.get(row.id);

        if (!treePromise) {
          treePromise = loadCollectionTree(row.id);
          treeByWorkspaceID.set(row.id, treePromise);
        }

        const tree = await treePromise;
        const currentEntryCollectionID = toCollectionID(row.currentEntryCollectionID);
        const collection = tree.collections.find(({ id }) => {
          return id === currentEntryCollectionID;
        });
        const restricted =
          collection?.restricted ||
          collection?.ancestors.some((ancestorID) => {
            return tree.collections.some((item) => {
              return item.id === ancestorID && item.restricted;
            });
          });

        if (restricted) {
          currentEntryID = null;
        }
      }

      return {
        id: toWorkspaceID(row.id),
        name: row.name,
        userID: toUserID(row.userID),
        currentEntryID: currentEntryID ? toEntryID(currentEntryID) : undefined,
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
