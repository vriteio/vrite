import { entries } from "#backend/db";
import type { WorkspaceEvent } from "#backend/events";
import { db } from "#backend/lib/adapters";
import { toUUID } from "#backend/lib/primitives";
import { and, eq, inArray } from "drizzle-orm";
import type { EntryAction } from "./actions";
import {
  loadAuthorizedCollectionTree,
  type AuthorizedCollectionTree
} from "./authorized-collection-tree";
import { hasAuthPermission } from "./permissions";
import type { SessionData } from "./session";

const isRestrictedAuthorizationEvent = (auth: SessionData, event: WorkspaceEvent): boolean => {
  const changesResourceLocation =
    event.action === "collection:move" ||
    (event.action === "entry:move" && event.data.restrictedBoundaryChanged === true);
  const changesRestriction =
    (event.action === "collection:create" && event.data.restricted) ||
    (event.action === "collection:update" && event.data.restricted !== undefined) ||
    event.action === "collection:delete";
  const changesAssignedAccess =
    event.action === "group:delete" ||
    event.action === "group:update" ||
    event.action === "group:members-update" ||
    event.action === "restricted-assignments:update";
  const changesAssignedRole =
    event.action === "role:delete" ||
    (event.action === "role:update" && event.data.permissions !== undefined);

  return (
    !hasAuthPermission(auth, "read:restricted_collections") &&
    (changesResourceLocation || changesRestriction || changesAssignedAccess || changesAssignedRole)
  );
};
const filterEntryIDs = async (
  auth: SessionData,
  authorization: AuthorizedCollectionTree,
  entryIDs: string[],
  action: EntryAction
): Promise<string[]> => {
  if (entryIDs.length === 0) return [];

  const rows = await db
    .select({ collectionID: entries.collectionID, id: entries.id })
    .from(entries)
    .where(
      and(
        eq(entries.workspaceID, toUUID(auth.workspaceID)),
        inArray(entries.id, [...new Set(entryIDs.map(toUUID))])
      )
    );
  const visibleEntryIDs = new Set(
    rows
      .filter(({ collectionID }) => authorization.canEntry(collectionID, action))
      .map(({ id }) => id)
  );

  return entryIDs.filter((entryID) => visibleEntryIDs.has(toUUID(entryID)));
};
const isEntryVisible = async (
  auth: SessionData,
  authorization: AuthorizedCollectionTree,
  entryID: string,
  action: EntryAction
): Promise<boolean> => {
  const visibleEntryIDs = await filterEntryIDs(auth, authorization, [entryID], action);

  return visibleEntryIDs.length === 1;
};
const filterRestrictedWorkspaceEvent = async (
  auth: SessionData,
  event: WorkspaceEvent
): Promise<WorkspaceEvent | null> => {
  const authorization = await loadAuthorizedCollectionTree({ auth, includeDeleted: true });

  if (event.action === "collection:create") {
    const access = authorization.getAccess(event.data.id);

    return access ? { ...event, access } : null;
  }

  if (event.action === "collection:update" || event.action === "collection:move") {
    return authorization.canAccessCollection(event.data.id) ? event : null;
  }

  if (event.action === "collection:delete") {
    const ids = event.data.ids.filter((id) => authorization.canAccessCollection(id));

    return ids.length > 0 ? { ...event, data: { ids } } : null;
  }

  if (event.action === "entry:create") {
    return authorization.canEntry(event.data.collectionID, "entry:read") ? event : null;
  }

  if (event.action === "entry:update" || event.action === "entry:move") {
    return (await isEntryVisible(auth, authorization, event.data.id, "entry:read")) ? event : null;
  }

  if (event.action === "entry:delete") {
    const ids = await filterEntryIDs(auth, authorization, event.data.ids, "entry:read");

    return ids.length > 0 ? { ...event, data: { ids } } : null;
  }

  if (event.action === "version:create" || event.action === "version:update") {
    return (await isEntryVisible(auth, authorization, event.data.entryID, "version:read"))
      ? event
      : null;
  }

  if (event.action === "version:delete") {
    const entryIDs = [...new Set(Object.values(event.data.entryIDsByVersionID))];
    const permittedEntryIDs = new Set(
      await filterEntryIDs(auth, authorization, entryIDs, "version:read")
    );
    const ids = event.data.ids.filter((versionID) => {
      const entryID = event.data.entryIDsByVersionID[versionID];

      return Boolean(entryID && permittedEntryIDs.has(entryID));
    });
    const entryIDsByVersionID = Object.fromEntries(
      ids.map((versionID) => [versionID, event.data.entryIDsByVersionID[versionID]])
    );

    return ids.length > 0 ? { ...event, data: { entryIDsByVersionID, ids } } : null;
  }

  if (event.action === "publishing:collection-update") {
    return authorization.canEntry(event.data.id, "publishing:read") ? event : null;
  }

  if (event.action === "publishing:entries-update") {
    const entryIDs = event.data.entries.map(({ entryID }) => entryID);
    const accessibleEntryIDs = new Set(
      await filterEntryIDs(auth, authorization, entryIDs, "publishing:read")
    );
    const visibleEntries = event.data.entries.filter(({ entryID }) => {
      return accessibleEntryIDs.has(entryID);
    });

    return visibleEntries.length > 0
      ? { ...event, data: { ...event.data, entries: visibleEntries } }
      : null;
  }

  if (event.action === "publishing:entries-content-update") {
    const accessibleEntryIDs = new Set(
      await filterEntryIDs(
        auth,
        authorization,
        event.data.entries.map(({ entryID }) => entryID),
        "publishing:read"
      )
    );
    const visibleEntries = event.data.entries.filter(({ entryID }) => {
      return accessibleEntryIDs.has(entryID);
    });

    return visibleEntries.length > 0 ? { ...event, data: { entries: visibleEntries } } : null;
  }

  if (event.action === "workspace:delete") {
    const entryIDs = await filterEntryIDs(auth, authorization, event.data.entryIDs, "entry:read");

    return { ...event, data: { ...event.data, entryIDs } };
  }

  return event;
};

export { filterRestrictedWorkspaceEvent, isRestrictedAuthorizationEvent };
