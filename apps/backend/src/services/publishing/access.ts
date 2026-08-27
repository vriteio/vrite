import {
  assertCollectionAccess,
  assertEntryAccess,
  canManageRestrictedCollections,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";
import { ORPCError } from "@orpc/server";

const authorizeCollectionSources = async (
  auth: SessionData,
  collectionIDs: string[],
  enablingPublishing = false
): Promise<void> => {
  const access = await loadRestrictedCollectionAccess(auth);
  const sourceCollectionIDs = access.allCollections
    .filter((collection) => {
      return collectionIDs.some((collectionID) => {
        return collection.id === collectionID || collection.ancestors.includes(collectionID);
      });
    })
    .map((collection) => collection.id);
  const configuresRestrictedSource = sourceCollectionIDs.some((collectionID) => {
    return access.boundaryByCollectionID.has(collectionID);
  });

  for (const collectionID of collectionIDs) {
    assertCollectionAccess(access, collectionID);
  }

  for (const collectionID of sourceCollectionIDs) {
    assertCollectionAccess(access, collectionID);
  }

  if (enablingPublishing && configuresRestrictedSource && !canManageRestrictedCollections(auth)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Restricted collections permission is required to enable publishing"
    });
  }
};
const authorizeEntrySources = async (auth: SessionData, entryIDs: string[]): Promise<void> => {
  const access = await loadRestrictedCollectionAccess(auth);

  await Promise.all(entryIDs.map((entryID) => assertEntryAccess(auth, access, entryID)));
};

export { authorizeCollectionSources, authorizeEntrySources };
