import { getPublishingStatusSnapshot } from "#backend/lib/publishing";
import {
  filterPermittedEntryIDs,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const getPublishingStatus = async (input: {
  auth: SessionData;
  workspaceID: string;
  channel: string;
}): Promise<{ channel: string; unpublishedEntryIDs: string[] }> => {
  const snapshot = await getPublishingStatusSnapshot(input);
  const access = await loadRestrictedCollectionAccess(input.auth);
  const unpublishedEntryIDs = snapshot.entries
    .filter(({ hasUnpublishedChanges }) => hasUnpublishedChanges)
    .map(({ entryID }) => entryID);

  return {
    channel: snapshot.channel,
    unpublishedEntryIDs: await filterPermittedEntryIDs(
      input.auth,
      access,
      unpublishedEntryIDs,
      "read:publishing"
    )
  };
};

export { getPublishingStatus };
