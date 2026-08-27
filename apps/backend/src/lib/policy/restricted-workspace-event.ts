import type { WorkspaceEvent } from "#backend/events";
import {
  canAccessCollection,
  canReadRestrictedCollections,
  filterAccessibleEntryIDs,
  getEntryCollection,
  loadRestrictedCollectionAccess
} from "./restricted-collections";
import type { SessionData } from "./session";

const isRestrictedAuthorizationEvent = (auth: SessionData, event: WorkspaceEvent): boolean => {
  const changesResourceLocation =
    (event.action === "collection:move" || event.action === "entry:move") &&
    event.data.restrictedBoundaryChanged === true;
  const changesRestriction =
    event.action === "collection:update" && event.data.restricted !== undefined;

  return !canReadRestrictedCollections(auth) && (changesResourceLocation || changesRestriction);
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
  if (canReadRestrictedCollections(auth)) return event;

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
    return (await isEntryVisible(auth, access, event.data.entryID)) ? event : null;
  }

  if (event.action === "version:delete") {
    return null;
  }

  if (event.action === "publishing:collection-update") {
    return canAccessCollection(access, event.data.id) ? event : null;
  }

  if (event.action === "publishing:entries-update") {
    const entryIDs = event.data.entries.map(({ entryID }) => entryID);
    const accessibleEntryIDs = new Set(
      await filterAccessibleEntryIDs(auth, access, entryIDs, true)
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
