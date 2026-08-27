import {
  collectionGroupRoles,
  collectionMemberRoles,
  entries,
  entryVersions,
  groupMembers,
  type Collection,
  type Permission,
  roles
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { loadCollectionTree } from "#backend/lib/data";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { hasPermission } from "./permissions";
import type { SessionData } from "./session";

interface RestrictedCollectionAccess {
  allCollections: Collection[];
  boundaryIDsByCollectionID: Map<string, string[]>;
  boundaryByCollectionID: Map<string, string>;
  collectionIDs: Set<string>;
  collections: Collection[];
  permissionsByBoundaryID: Map<string, Permission[]>;
  restrictedBoundaryIDs: Set<string>;
}

interface ResourceCollection {
  collectionID: string | null;
}

const canReadRestrictedCollections = (auth: SessionData): boolean => {
  if (auth.type !== "session" || !auth.session) return false;
  if (auth.session.admin) return true;

  return auth.session.permissions.some((permission) => {
    return hasPermission(permission, "read:restricted_collections");
  });
};
const canManageRestrictedCollections = (auth: SessionData): boolean => {
  if (auth.type !== "session" || !auth.session) return false;
  if (auth.session.admin) return true;

  return auth.session.permissions.some((permission) => {
    return hasPermission(permission, "restricted_collections");
  });
};
const loadAssignedBoundaryPermissions = async (
  auth: SessionData
): Promise<Map<string, Permission[]>> => {
  const permissionsByBoundaryID = new Map<string, Permission[]>();

  if (auth.type !== "session" || !auth.session || canReadRestrictedCollections(auth)) {
    return permissionsByBoundaryID;
  }

  const workspaceID = toUUID(auth.workspaceID);
  const membershipID = toUUID(auth.session.memberID);
  const [directAssignments, groupAssignments] = await Promise.all([
    db
      .select({
        collectionID: collectionMemberRoles.collectionID,
        permissions: roles.permissions,
        baseRole: roles.baseRole
      })
      .from(collectionMemberRoles)
      .innerJoin(roles, eq(roles.id, collectionMemberRoles.roleID))
      .where(
        and(
          eq(collectionMemberRoles.workspaceID, workspaceID),
          eq(collectionMemberRoles.membershipID, membershipID)
        )
      ),
    db
      .select({
        collectionID: collectionGroupRoles.collectionID,
        permissions: roles.permissions,
        baseRole: roles.baseRole
      })
      .from(groupMembers)
      .innerJoin(
        collectionGroupRoles,
        and(
          eq(collectionGroupRoles.workspaceID, groupMembers.workspaceID),
          eq(collectionGroupRoles.groupID, groupMembers.groupID)
        )
      )
      .innerJoin(roles, eq(roles.id, collectionGroupRoles.roleID))
      .where(
        and(eq(groupMembers.workspaceID, workspaceID), eq(groupMembers.membershipID, membershipID))
      )
  ]);

  for (const assignment of [...directAssignments, ...groupAssignments]) {
    if (assignment.baseRole === "admin") continue;

    const boundaryID = toCollectionID(assignment.collectionID);
    const permissions = permissionsByBoundaryID.get(boundaryID) || [];

    permissionsByBoundaryID.set(boundaryID, [
      ...new Set([...permissions, ...assignment.permissions])
    ]);
  }

  return permissionsByBoundaryID;
};
const loadRestrictedCollectionAccess = async (
  auth: SessionData,
  includeDeleted = false
): Promise<RestrictedCollectionAccess> => {
  const canReadRestricted = canReadRestrictedCollections(auth);
  const [tree, permissionsByBoundaryID] = await Promise.all([
    loadCollectionTree(auth.workspaceID, includeDeleted),
    loadAssignedBoundaryPermissions(auth)
  ]);
  const boundaryIDsByCollectionID = new Map<string, string[]>();
  const boundaryByCollectionID = new Map<string, string>();
  const restrictedBoundaryIDs = new Set(
    tree.collections
      .filter((collection) => collection.restricted)
      .map((collection) => collection.id)
  );

  for (const collection of tree.collections) {
    const boundaryIDs = [...collection.ancestors, collection.id].filter((collectionID) => {
      return restrictedBoundaryIDs.has(collectionID);
    });
    const boundaryID = boundaryIDs[boundaryIDs.length - 1];

    if (boundaryIDs.length > 0) {
      boundaryIDsByCollectionID.set(collection.id, boundaryIDs);
    }

    if (boundaryID) {
      boundaryByCollectionID.set(collection.id, boundaryID);
    }
  }

  const collectionIDs = new Set(
    tree.collections
      .filter((collection) => {
        const boundaryIDs = boundaryIDsByCollectionID.get(collection.id) || [];

        return (
          canReadRestricted ||
          boundaryIDs.length === 0 ||
          boundaryIDs.every((boundaryID) => permissionsByBoundaryID.has(boundaryID))
        );
      })
      .map((collection) => collection.id)
  );
  const collections = tree.collections
    .filter((collection) => collectionIDs.has(collection.id))
    .map((collection) => ({
      ...collection,
      descendants: collection.descendants.filter((id) => collectionIDs.has(id))
    }));

  return {
    allCollections: tree.collections,
    boundaryIDsByCollectionID,
    boundaryByCollectionID,
    collectionIDs,
    collections,
    permissionsByBoundaryID,
    restrictedBoundaryIDs
  };
};
const canAccessCollection = (
  access: RestrictedCollectionAccess,
  collectionID?: string | null
): boolean => {
  return !collectionID || access.collectionIDs.has(collectionID);
};
const assertCollectionAccess = (
  access: RestrictedCollectionAccess,
  collectionID?: string | null
): void => {
  if (canAccessCollection(access, collectionID)) return;

  throw new ORPCError("NOT_FOUND");
};
const hasCollectionPermission = (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  collectionID: string | null | undefined,
  requiredPermission: Permission
): boolean => {
  const boundaryID = collectionID ? access.boundaryByCollectionID.get(collectionID) : undefined;

  if (!boundaryID || canReadRestrictedCollections(auth)) {
    if (auth.type === "key") return !boundaryID;
    if (!auth.session) return false;
    if (auth.session.admin) return true;

    return auth.session.permissions.some((permission) => {
      return hasPermission(permission, requiredPermission);
    });
  }

  if (!canAccessCollection(access, collectionID)) return false;

  return (access.permissionsByBoundaryID.get(boundaryID) || []).some((permission) => {
    return hasPermission(permission, requiredPermission);
  });
};
const assertCollectionPermission = (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  collectionID: string | null | undefined,
  requiredPermission: Permission
): void => {
  assertCollectionAccess(access, collectionID);

  if (hasCollectionPermission(auth, access, collectionID, requiredPermission)) return;

  throw new ORPCError("FORBIDDEN", {
    message: `Missing required permission: ${requiredPermission}`
  });
};
const assertCollectionMovePermission = (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  sourceCollectionID?: string | null,
  targetCollectionID?: string | null
): void => {
  assertCollectionPermission(auth, access, sourceCollectionID, "content");
  assertCollectionPermission(auth, access, targetCollectionID, "content");
};
const assertCollectionSubtreePermission = (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  collectionIDs: string[],
  requiredPermission: Permission
): void => {
  for (const collectionID of collectionIDs) {
    assertCollectionAccess(access, collectionID);
  }

  const affectedCollections = access.allCollections.filter((collection) => {
    return collectionIDs.some((collectionID) => {
      return collection.id === collectionID || collection.ancestors.includes(collectionID);
    });
  });

  for (const collection of affectedCollections) {
    assertCollectionPermission(auth, access, collection.id, requiredPermission);
  }
};
const assertRestrictedSubtreeManagement = (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  collectionIDs: string[]
): void => {
  if (canManageRestrictedCollections(auth)) return;

  const containsBoundary = access.allCollections.some((collection) => {
    if (!access.restrictedBoundaryIDs.has(collection.id)) return false;

    return collectionIDs.some((collectionID) => {
      return collection.id === collectionID || collection.ancestors.includes(collectionID);
    });
  });

  if (!containsBoundary) return;

  throw new ORPCError("FORBIDDEN", {
    message: "Restricted collections permission is required for this collection tree"
  });
};
const getEntryCollection = async (
  auth: SessionData,
  entryID: string,
  includeDeleted = false
): Promise<ResourceCollection> => {
  const filters = [
    eq(entries.id, toUUID(entryID)),
    eq(entries.workspaceID, toUUID(auth.workspaceID))
  ];

  if (!includeDeleted) {
    filters.push(isNull(entries.deletedAt));
  }

  const [entry] = await db
    .select({ collectionID: entries.collectionID })
    .from(entries)
    .where(and(...filters));

  if (!entry) throw new ORPCError("NOT_FOUND");

  return {
    collectionID: entry.collectionID ? toCollectionID(entry.collectionID) : null
  };
};
const getVersionCollection = async (
  auth: SessionData,
  versionID: string,
  includeDeleted = false
): Promise<ResourceCollection> => {
  const entryJoinFilters = [
    eq(entries.id, entryVersions.entryID),
    eq(entries.workspaceID, entryVersions.workspaceID)
  ];

  if (!includeDeleted) {
    entryJoinFilters.push(isNull(entries.deletedAt));
  }

  const [version] = await db
    .select({ collectionID: entries.collectionID })
    .from(entryVersions)
    .innerJoin(entries, and(...entryJoinFilters))
    .where(
      and(
        eq(entryVersions.id, toUUID(versionID)),
        eq(entryVersions.workspaceID, toUUID(auth.workspaceID))
      )
    );

  if (!version) throw new ORPCError("NOT_FOUND");

  return {
    collectionID: version.collectionID ? toCollectionID(version.collectionID) : null
  };
};
const assertEntryAccess = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  entryID: string
): Promise<void> => {
  const entry = await getEntryCollection(auth, entryID);

  assertCollectionAccess(access, entry.collectionID);
};
const assertEntryPermission = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  entryID: string,
  requiredPermission: Permission
): Promise<void> => {
  const entry = await getEntryCollection(auth, entryID);

  assertCollectionPermission(auth, access, entry.collectionID, requiredPermission);
};
const assertVersionAccess = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  versionID: string
): Promise<void> => {
  const version = await getVersionCollection(auth, versionID);

  assertCollectionAccess(access, version.collectionID);
};
const assertVersionPermission = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  versionID: string,
  requiredPermission: Permission
): Promise<void> => {
  const version = await getVersionCollection(auth, versionID);

  assertCollectionPermission(auth, access, version.collectionID, requiredPermission);
};
const filterAccessibleEntryIDs = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  entryIDs: string[],
  includeDeleted = false
): Promise<string[]> => {
  if (entryIDs.length === 0) return [];

  const filters = [
    eq(entries.workspaceID, toUUID(auth.workspaceID)),
    inArray(entries.id, entryIDs.map(toUUID))
  ];

  if (!includeDeleted) {
    filters.push(isNull(entries.deletedAt));
  }

  const rows = await db
    .select({ id: entries.id, collectionID: entries.collectionID })
    .from(entries)
    .where(and(...filters));
  const accessibleIDs = new Set(
    rows
      .filter((entry) => {
        const collectionID = entry.collectionID ? toCollectionID(entry.collectionID) : null;

        return canAccessCollection(access, collectionID);
      })
      .map((entry) => toEntryID(entry.id))
  );

  return entryIDs.filter((entryID) => accessibleIDs.has(entryID));
};
const filterPermittedEntryIDs = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  entryIDs: string[],
  requiredPermission: Permission,
  includeDeleted = false
): Promise<string[]> => {
  if (entryIDs.length === 0) return [];

  const filters = [
    eq(entries.workspaceID, toUUID(auth.workspaceID)),
    inArray(entries.id, entryIDs.map(toUUID))
  ];

  if (!includeDeleted) {
    filters.push(isNull(entries.deletedAt));
  }

  const rows = await db
    .select({ id: entries.id, collectionID: entries.collectionID })
    .from(entries)
    .where(and(...filters));
  const permittedIDs = new Set(
    rows
      .filter((entry) => {
        const collectionID = entry.collectionID ? toCollectionID(entry.collectionID) : null;

        return hasCollectionPermission(auth, access, collectionID, requiredPermission);
      })
      .map((entry) => toEntryID(entry.id))
  );

  return entryIDs.filter((entryID) => permittedIDs.has(entryID));
};

export {
  assertCollectionAccess,
  assertCollectionMovePermission,
  assertCollectionPermission,
  assertCollectionSubtreePermission,
  assertEntryAccess,
  assertEntryPermission,
  assertRestrictedSubtreeManagement,
  assertVersionAccess,
  assertVersionPermission,
  canAccessCollection,
  canManageRestrictedCollections,
  canReadRestrictedCollections,
  filterAccessibleEntryIDs,
  filterPermittedEntryIDs,
  getEntryCollection,
  hasCollectionPermission,
  loadRestrictedCollectionAccess
};
export type { RestrictedCollectionAccess };
