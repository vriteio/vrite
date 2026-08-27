import { entries, entryVersions, type Collection } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { loadCollectionTree } from "#backend/lib/data";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { hasPermission } from "./permissions";
import type { SessionData } from "./session";

interface RestrictedCollectionAccess {
  allCollections: Collection[];
  boundaryByCollectionID: Map<string, string>;
  collectionIDs: Set<string>;
  collections: Collection[];
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
const loadRestrictedCollectionAccess = async (
  auth: SessionData,
  includeDeleted = false
): Promise<RestrictedCollectionAccess> => {
  const canReadRestricted = canReadRestrictedCollections(auth);
  const tree = await loadCollectionTree(auth.workspaceID, includeDeleted);
  const boundaryByCollectionID = new Map<string, string>();
  const collectionByID = new Map(tree.collections.map((collection) => [collection.id, collection]));
  const restrictedBoundaryIDs = new Set(
    tree.collections
      .filter((collection) => collection.restricted)
      .map((collection) => collection.id)
  );
  const resolveBoundary = (collectionID: string): string | undefined => {
    if (boundaryByCollectionID.has(collectionID)) {
      return boundaryByCollectionID.get(collectionID);
    }

    const collection = collectionByID.get(collectionID);

    if (!collection) return;

    const parentID = collection.ancestors[collection.ancestors.length - 1];
    const boundaryID = collection.restricted
      ? collection.id
      : parentID
        ? resolveBoundary(parentID)
        : undefined;

    if (boundaryID) {
      boundaryByCollectionID.set(collectionID, boundaryID);
    }

    return boundaryID;
  };

  for (const collection of tree.collections) {
    resolveBoundary(collection.id);
  }

  const collectionIDs = new Set(
    tree.collections
      .filter((collection) => {
        return canReadRestricted || !boundaryByCollectionID.has(collection.id);
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
    boundaryByCollectionID,
    collectionIDs,
    collections,
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
const assertRestrictedBoundaryChange = (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  sourceCollectionID?: string | null,
  targetCollectionID?: string | null
): void => {
  const sourceBoundaryID = sourceCollectionID
    ? access.boundaryByCollectionID.get(sourceCollectionID)
    : undefined;
  const targetBoundaryID = targetCollectionID
    ? access.boundaryByCollectionID.get(targetCollectionID)
    : undefined;

  if (sourceBoundaryID === targetBoundaryID) return;
  if (canManageRestrictedCollections(auth)) return;

  throw new ORPCError("FORBIDDEN", {
    message: "Restricted collections permission is required to cross this access boundary"
  });
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
const assertVersionAccess = async (
  auth: SessionData,
  access: RestrictedCollectionAccess,
  versionID: string
): Promise<void> => {
  const version = await getVersionCollection(auth, versionID);

  assertCollectionAccess(access, version.collectionID);
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

export {
  assertCollectionAccess,
  assertEntryAccess,
  assertRestrictedBoundaryChange,
  assertRestrictedSubtreeManagement,
  assertVersionAccess,
  canAccessCollection,
  canManageRestrictedCollections,
  canReadRestrictedCollections,
  filterAccessibleEntryIDs,
  getEntryCollection,
  loadRestrictedCollectionAccess
};
export type { RestrictedCollectionAccess };
