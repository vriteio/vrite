import {
  collectionGroupRoles,
  collectionMemberRoles,
  groupMembers,
  roles,
  type Collection,
  type KeyPermission,
  type Permission
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { loadCollectionTree } from "#backend/lib/data";
import { toCollectionID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import type { CollectionAccess, CollectionAction, EntryAction } from "./actions";
import type { EntryAuthorizationSource } from "./authorized-entry-sources";
import { hasAuthPermission, hasPermission, isAdminAuthorization } from "./permissions";
import type { SessionData } from "./session";

interface AuthorizedCollectionNode {
  collectionActions: CollectionAction[];
  entryActions: EntryAction[];
  restrictedBoundaryIDs: string[];
}

interface AuthorizedCollectionTreeInput {
  allCollections: Collection[];
  auth: SessionData;
  permissionsByBoundaryID: Map<string, Permission[]>;
  publishingEnabledCollectionIDs: Set<string>;
}

interface LoadAuthorizedCollectionTreeInput {
  auth: SessionData;
  database?: Database;
  includeDeleted?: boolean;
}

interface SubtreeAccessSummary {
  canDelete: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  fullyVisible: boolean;
}

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Database = DatabaseTransaction | typeof db;

const COLLECTION_CONTENT_ACTIONS: CollectionAction[] = [
  "collection:create-child",
  "collection:update",
  "collection:move"
];
const ENTRY_CONTENT_ACTIONS: EntryAction[] = [
  "entry:create",
  "entry:update",
  "entry:move",
  "entry:delete",
  "version:read",
  "version:create",
  "version:update",
  "version:revert",
  "publishing:publish",
  "publishing:unpublish"
];

const hasGrantedPermission = (
  permissions: Array<KeyPermission | Permission>,
  required: KeyPermission | Permission
): boolean => {
  return permissions.some((permission) => hasPermission(permission, required));
};
const canReadAllRestrictedCollections = (auth: SessionData): boolean => {
  return hasAuthPermission(auth, "read:restricted_collections");
};
const getRestrictedBoundaryIDs = (
  collection: Collection,
  restrictedBoundaryIDs: Set<string>
): string[] => {
  return [...collection.ancestors, collection.id].filter((collectionID) => {
    return restrictedBoundaryIDs.has(collectionID);
  });
};
const isCollectionVisible = (
  auth: SessionData,
  boundaryIDs: string[],
  permissionsByBoundaryID: Map<string, Permission[]>
): boolean => {
  if (canReadAllRestrictedCollections(auth) || boundaryIDs.length === 0) return true;
  if (auth.type !== "session" || !auth.session) return false;

  return boundaryIDs.every((boundaryID) => permissionsByBoundaryID.has(boundaryID));
};
const getSessionCollectionPermissions = (
  auth: SessionData,
  boundaryIDs: string[],
  permissionsByBoundaryID: Map<string, Permission[]>
): Permission[] => {
  if (auth.type !== "session" || !auth.session) return [];
  if (canReadAllRestrictedCollections(auth) || boundaryIDs.length === 0) {
    return auth.session.permissions;
  }

  const nearestBoundaryID = boundaryIDs[boundaryIDs.length - 1];

  return permissionsByBoundaryID.get(nearestBoundaryID) || [];
};
const getSessionActions = (auth: SessionData, permissions: Permission[]): CollectionAccess => {
  if (auth.type !== "session" || !auth.session) {
    return { collectionActions: [], entryActions: [] };
  }

  const collectionActions: CollectionAction[] = ["collection:read"];
  const entryActions: EntryAction[] = ["entry:read", "publishing:read"];
  const canManageContent =
    isAdminAuthorization(auth) || hasGrantedPermission(permissions, "content");
  const canManagePublishing =
    isAdminAuthorization(auth) || hasGrantedPermission(permissions, "publishing");

  if (canManageContent) {
    collectionActions.push(...COLLECTION_CONTENT_ACTIONS);
    entryActions.push(...ENTRY_CONTENT_ACTIONS);
  }

  if (canManagePublishing) {
    collectionActions.push("collection:set-publishing");
  }

  if (hasAuthPermission(auth, "restricted_collections")) {
    collectionActions.push("collection:set-restricted", "collection:manage-restricted-access");
  }

  return { collectionActions, entryActions };
};
const getKeyActions = (auth: SessionData): CollectionAccess => {
  if (auth.type !== "key" || !auth.key) {
    return { collectionActions: [], entryActions: [] };
  }

  const collectionActions: CollectionAction[] = [];
  const entryActions: EntryAction[] = [];
  const permissions = auth.key.permissions;

  if (hasGrantedPermission(permissions, "read:collections")) {
    collectionActions.push("collection:read");
  }

  if (hasGrantedPermission(permissions, "collections")) {
    collectionActions.push(...COLLECTION_CONTENT_ACTIONS);
  }

  if (hasGrantedPermission(permissions, "read:entries")) {
    entryActions.push("entry:read");
  }

  if (hasGrantedPermission(permissions, "entries")) {
    entryActions.push("entry:create", "entry:update", "entry:move", "entry:delete");
  }

  if (hasGrantedPermission(permissions, "read:versions")) {
    entryActions.push("version:read");
  }

  if (hasGrantedPermission(permissions, "read:publishing")) {
    entryActions.push("publishing:read");
  }

  if (hasGrantedPermission(permissions, "versions")) {
    entryActions.push("version:create", "version:update", "version:revert");
  }

  if (hasGrantedPermission(permissions, "publishing")) {
    collectionActions.push("collection:set-publishing");
    entryActions.push("publishing:publish", "publishing:unpublish");
  }

  return {
    collectionActions: [...new Set(collectionActions)],
    entryActions: [...new Set(entryActions)]
  };
};
const applySubtreeActions = (
  collectionID: string,
  collectionsByID: Map<string, Collection>,
  fullyVisibleCollectionIDs: Set<string>,
  nodesByCollectionID: Map<string, AuthorizedCollectionNode>,
  rootID: string
): SubtreeAccessSummary => {
  const collection = collectionsByID.get(collectionID);
  const node = nodesByCollectionID.get(collectionID);
  let canDelete = Boolean(
    node?.collectionActions.includes("collection:update") && collectionID !== rootID
  );
  let canPublish = Boolean(node?.entryActions.includes("publishing:publish"));
  let canUnpublish = Boolean(node?.entryActions.includes("publishing:unpublish"));
  let fullyVisible = Boolean(node);

  if (!collection) return { canDelete: false, canPublish, canUnpublish, fullyVisible: false };

  for (const childID of collection.descendants) {
    const childAccess = applySubtreeActions(
      childID,
      collectionsByID,
      fullyVisibleCollectionIDs,
      nodesByCollectionID,
      rootID
    );

    canDelete = canDelete && childAccess.canDelete;
    canPublish = canPublish || childAccess.canPublish;
    canUnpublish = canUnpublish || childAccess.canUnpublish;
    fullyVisible = fullyVisible && childAccess.fullyVisible;
  }

  if (node && canDelete) {
    node.collectionActions.push("collection:delete");
  }

  if (node && canPublish) {
    node.collectionActions.push("publishing:publish-tree");
  }

  if (node && canUnpublish) {
    node.collectionActions.push("publishing:unpublish-tree");
  }

  if (fullyVisible) {
    fullyVisibleCollectionIDs.add(collectionID);
  }

  return { canDelete, canPublish, canUnpublish, fullyVisible };
};
const createAuthorizedCollectionTree = (
  input: AuthorizedCollectionTreeInput
): AuthorizedCollectionTree => {
  const restrictedBoundaryIDs = new Set(
    input.allCollections
      .filter((collection) => collection.restricted)
      .map((collection) => collection.id)
  );
  const childCollectionIDs = new Set(
    input.allCollections.flatMap((collection) => collection.descendants)
  );
  const root = input.allCollections.find((collection) => {
    return !childCollectionIDs.has(collection.id);
  });
  const nodesByCollectionID = new Map<string, AuthorizedCollectionNode>();
  const fullyVisibleCollectionIDs = new Set<string>();

  if (!root) {
    return new AuthorizedCollectionTree(
      [],
      fullyVisibleCollectionIDs,
      nodesByCollectionID,
      input.publishingEnabledCollectionIDs,
      ""
    );
  }

  const collectionsByID = new Map(
    input.allCollections.map((collection) => [collection.id, collection])
  );

  for (const collection of input.allCollections) {
    const boundaryIDs = getRestrictedBoundaryIDs(collection, restrictedBoundaryIDs);

    if (!isCollectionVisible(input.auth, boundaryIDs, input.permissionsByBoundaryID)) continue;

    const access =
      input.auth.type === "key"
        ? getKeyActions(input.auth)
        : getSessionActions(
            input.auth,
            getSessionCollectionPermissions(input.auth, boundaryIDs, input.permissionsByBoundaryID)
          );

    if (collection.id === root.id) {
      access.collectionActions = access.collectionActions.filter((action) => {
        return (
          action !== "collection:update" &&
          action !== "collection:move" &&
          action !== "collection:set-restricted" &&
          action !== "collection:manage-restricted-access" &&
          action !== "collection:set-publishing"
        );
      });
    } else if (!collection.restricted) {
      access.collectionActions = access.collectionActions.filter((action) => {
        return action !== "collection:manage-restricted-access";
      });
    }

    nodesByCollectionID.set(collection.id, {
      collectionActions: access.collectionActions,
      entryActions: access.entryActions,
      restrictedBoundaryIDs: boundaryIDs
    });
  }

  applySubtreeActions(
    root.id,
    collectionsByID,
    fullyVisibleCollectionIDs,
    nodesByCollectionID,
    root.id
  );

  const collections = input.allCollections
    .filter((collection) => nodesByCollectionID.has(collection.id))
    .map((collection) => ({
      ...collection,
      descendants: collection.descendants.filter((collectionID) => {
        return nodesByCollectionID.has(collectionID);
      })
    }));

  return new AuthorizedCollectionTree(
    collections,
    fullyVisibleCollectionIDs,
    nodesByCollectionID,
    input.publishingEnabledCollectionIDs,
    root.id
  );
};
const loadAssignedBoundaryPermissions = async (
  auth: SessionData,
  database: Database
): Promise<Map<string, Permission[]>> => {
  const permissionsByBoundaryID = new Map<string, Permission[]>();

  if (auth.type !== "session" || !auth.session || canReadAllRestrictedCollections(auth)) {
    return permissionsByBoundaryID;
  }

  const workspaceID = toUUID(auth.workspaceID);
  const membershipID = toUUID(auth.session.memberID);
  const [directAssignments, groupAssignments] = await Promise.all([
    database
      .select({
        collectionID: collectionMemberRoles.collectionID,
        permissions: roles.permissions
      })
      .from(collectionMemberRoles)
      .innerJoin(roles, eq(roles.id, collectionMemberRoles.roleID))
      .where(
        and(
          eq(collectionMemberRoles.workspaceID, workspaceID),
          eq(collectionMemberRoles.membershipID, membershipID)
        )
      ),
    database
      .select({
        collectionID: collectionGroupRoles.collectionID,
        permissions: roles.permissions
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
    const boundaryID = toCollectionID(assignment.collectionID);
    const permissions = permissionsByBoundaryID.get(boundaryID) || [];

    permissionsByBoundaryID.set(boundaryID, [
      ...new Set([...permissions, ...assignment.permissions])
    ]);
  }

  return permissionsByBoundaryID;
};
const loadAuthorizedCollectionTree = async (
  input: LoadAuthorizedCollectionTreeInput
): Promise<AuthorizedCollectionTree> => {
  const database = input.database || db;
  const [tree, permissionsByBoundaryID] = await Promise.all([
    loadCollectionTree(input.auth.workspaceID, input.includeDeleted, database),
    loadAssignedBoundaryPermissions(input.auth, database)
  ]);

  return createAuthorizedCollectionTree({
    allCollections: tree.collections,
    auth: input.auth,
    permissionsByBoundaryID,
    publishingEnabledCollectionIDs: new Set(
      tree.rows
        .filter((collection) => collection.publishingEnabled)
        .map((collection) => toCollectionID(collection.id))
    )
  });
};
class AuthorizedCollectionTree {
  readonly collections: Collection[];
  readonly rootID: string;
  private readonly fullyVisibleCollectionIDs: Set<string>;
  private readonly nodesByCollectionID: Map<string, AuthorizedCollectionNode>;
  private readonly publishingEnabledCollectionIDs: Set<string>;

  constructor(
    collections: Collection[],
    fullyVisibleCollectionIDs: Set<string>,
    nodesByCollectionID: Map<string, AuthorizedCollectionNode>,
    publishingEnabledCollectionIDs: Set<string>,
    rootID: string
  ) {
    this.collections = collections;
    this.fullyVisibleCollectionIDs = fullyVisibleCollectionIDs;
    this.nodesByCollectionID = nodesByCollectionID;
    this.publishingEnabledCollectionIDs = publishingEnabledCollectionIDs;
    this.rootID = rootID;
  }

  private resolveCollectionID(collectionID?: string | null): string {
    if (!collectionID) return this.rootID;

    return collectionID.includes("_") ? collectionID : toCollectionID(collectionID);
  }

  getAccess(collectionID?: string | null): CollectionAccess | null {
    const resolvedCollectionID = this.resolveCollectionID(collectionID);
    const node = this.nodesByCollectionID.get(resolvedCollectionID);

    if (!node) return null;

    return {
      collectionActions: [...node.collectionActions],
      entryActions: [...node.entryActions]
    };
  }

  canAccessCollection(collectionID?: string | null): boolean {
    return this.getAccess(collectionID) !== null;
  }

  isPublishingEnabled(collectionID?: string | null): boolean {
    const resolvedCollectionID = this.resolveCollectionID(collectionID);
    const collection = this.collections.find(({ id }) => id === resolvedCollectionID);
    const collectionIDs = [...(collection?.ancestors || []), resolvedCollectionID];

    return collectionIDs.some((id) => this.publishingEnabledCollectionIDs.has(id));
  }

  getRestrictedBoundaryID(collectionID?: string | null): string | undefined {
    const resolvedCollectionID = this.resolveCollectionID(collectionID);
    const boundaryIDs = this.nodesByCollectionID.get(resolvedCollectionID)?.restrictedBoundaryIDs;

    return boundaryIDs?.[boundaryIDs.length - 1];
  }

  canCollection(collectionID: string | null | undefined, action: CollectionAction): boolean {
    return this.getAccess(collectionID)?.collectionActions.includes(action) ?? false;
  }

  canEntry(collectionID: string | null | undefined, action: EntryAction): boolean {
    return this.getAccess(collectionID)?.entryActions.includes(action) ?? false;
  }

  private assertCollectionAccess(collectionID?: string | null): void {
    if (this.canAccessCollection(collectionID)) return;

    throw new ORPCError("NOT_FOUND");
  }

  assertCollectionAction(collectionID: string | null | undefined, action: CollectionAction): void {
    this.assertCollectionAccess(collectionID);

    if (this.canCollection(collectionID, action)) return;

    throw new ORPCError("FORBIDDEN", { message: `Action is not allowed: ${action}` });
  }

  assertCollectionSources(collectionIDs: string[], action: CollectionAction): void {
    for (const collectionID of collectionIDs) {
      this.assertCollectionAction(collectionID, action);
    }
  }

  assertFullyVisibleSubtree(collectionID: string): void {
    const resolvedCollectionID = this.resolveCollectionID(collectionID);

    this.assertCollectionAccess(resolvedCollectionID);

    if (this.fullyVisibleCollectionIDs.has(resolvedCollectionID)) return;

    throw new ORPCError("FORBIDDEN", {
      message: "Full collection tree visibility is required"
    });
  }

  assertEntryAction(collectionID: string | null | undefined, action: EntryAction): void {
    this.assertCollectionAccess(collectionID);

    if (this.canEntry(collectionID, action)) return;

    throw new ORPCError("FORBIDDEN", { message: `Action is not allowed: ${action}` });
  }

  assertEntrySources(sources: EntryAuthorizationSource[], action: EntryAction): void {
    for (const source of sources) {
      this.assertEntryAction(source.collectionID, action);
    }
  }

  filterEntryIDs(sources: EntryAuthorizationSource[], action: EntryAction): string[] {
    return sources
      .filter(({ collectionID }) => this.canEntry(collectionID, action))
      .map(({ id }) => id);
  }

  toAccessRecord(): Record<string, CollectionAccess> {
    return Object.fromEntries(
      [...this.nodesByCollectionID].map(([collectionID, node]) => [
        collectionID,
        {
          collectionActions: [...node.collectionActions],
          entryActions: [...node.entryActions]
        }
      ])
    );
  }
}

export { AuthorizedCollectionTree, loadAuthorizedCollectionTree };
