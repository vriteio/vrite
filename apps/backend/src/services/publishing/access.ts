import {
  assertCollectionSubtreePermission,
  assertEntryPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";
import type { Permission } from "#backend/db";

const authorizeCollectionSources = async (
  auth: SessionData,
  collectionIDs: string[],
  requiredPermission: Permission
): Promise<void> => {
  const access = await loadRestrictedCollectionAccess(auth);

  assertCollectionSubtreePermission(auth, access, collectionIDs, requiredPermission);
};
const authorizeEntrySources = async (
  auth: SessionData,
  entryIDs: string[],
  requiredPermission: Permission
): Promise<void> => {
  const access = await loadRestrictedCollectionAccess(auth);

  await Promise.all(
    entryIDs.map((entryID) => {
      return assertEntryPermission(auth, access, entryID, requiredPermission);
    })
  );
};

export { authorizeCollectionSources, authorizeEntrySources };
