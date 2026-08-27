import type { WorkspaceEvent } from "#backend/events";
import {
  canAccessCollection,
  canReadRestrictedCollections,
  filterAccessibleEntryIDs,
  filterPermittedEntryIDs,
  getEntryCollection,
  hasCollectionPermission,
  loadRestrictedCollectionAccess
} from "./restricted-collections";
import type { SessionData } from "./session";

const isRestrictedAuthorizationEvent = (auth: SessionData, event: WorkspaceEvent): boolean => {
  const changesResourceLocation =
    (event.action === "collection:move" || event.action === "entry:move") &&
    event.data.restrictedBoundaryChanged === true;
  const changesRestriction =
    event.action === "collection:update" && event.data.restricted !== undefined;
  const changesAssignedAccess =
    event.action === "group:delete" ||
    event.action === "group:update" ||
    event.action === "group:members-update" ||
    event.action === "restricted-assignments:update";
  const changesAssignedRole =
    event.action === "role:delete" ||
    (event.action === "role:update" && event.data.permissions !== undefined);

  return (
    !canReadRestrictedCollections(auth) &&
    (changesResourceLocation || changesRestriction || changesAssignedAccess || changesAssignedRole)
  );
};
const isEntryVisible = async (
  auth: SessionData,
  access: Awaited<ReturnType<typeof loadRestrictedCollectionAccess>>,
  entryID: string
): Promise<boolean> => {
  try {
    const entry = await getEntryCollection(auth, entryID, true);

    return canAccessCollection(access, entry.collectionID);
  } catch {
    return false;
  }
};
const filterRestrictedWorkspaceEvent = async (
  auth: SessionData,
  event: WorkspaceEvent
): Promise<WorkspaceEvent | null> => {
  const access = await loadRestrictedCollectionAccess(auth, true);

  if (event.action === "collection:create") {
    return canAccessCollection(access, event.data.id) ? event : null;
  }

  if (event.action === "collection:update" || event.action === "collection:move") {
    return canAccessCollection(access, event.data.id) ? event : null;
  }

  if (event.action === "collection:delete") {
    const ids = event.data.ids.filter((id) => access.collectionIDs.has(id));

    return ids.length > 0 ? { ...event, data: { ids } } : null;
  }

  if (event.action === "entry:create") {
    return canAccessCollection(access, event.data.collectionID) ? event : null;
  }

  if (event.action === "entry:update" || event.action === "entry:move") {
    return (await isEntryVisible(auth, access, event.data.id)) ? event : null;
  }

  if (event.action === "entry:delete") {
    const ids = await filterAccessibleEntryIDs(auth, access, event.data.ids, true);

    return ids.length > 0 ? { ...event, data: { ids } } : null;
  }

  if (event.action === "version:create" || event.action === "version:update") {
    const entryIDs = await filterPermittedEntryIDs(
      auth,
      access,
      [event.data.entryID],
      "read:versions",
      true
    );

    return entryIDs.length > 0 ? event : null;
  }

  if (event.action === "version:delete") {
    const entryIDs = [...new Set(Object.values(event.data.entryIDsByVersionID))];
    const permittedEntryIDs = new Set(
      await filterPermittedEntryIDs(auth, access, entryIDs, "read:versions", true)
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
    return hasCollectionPermission(auth, access, event.data.id, "read:publishing") ? event : null;
  }

  if (event.action === "publishing:entries-update") {
    const entryIDs = event.data.entries.map(({ entryID }) => entryID);
    const accessibleEntryIDs = new Set(
      await filterPermittedEntryIDs(auth, access, entryIDs, "read:publishing", true)
    );
    const entries = event.data.entries.filter(({ entryID }) => {
      return accessibleEntryIDs.has(entryID);
    });

    return entries.length > 0 ? { ...event, data: { ...event.data, entries } } : null;
  }

  if (event.action === "workspace:delete") {
    const entryIDs = await filterAccessibleEntryIDs(auth, access, event.data.entryIDs, true);

    return { ...event, data: { ...event.data, entryIDs } };
  }

  return event;
};

export { filterRestrictedWorkspaceEvent, isRestrictedAuthorizationEvent };
