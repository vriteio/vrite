import { getPublishingStatusSnapshot } from "#backend/lib/publishing";

const getPublishingStatus = async (input: {
  workspaceID: string;
  channel: string;
}): Promise<{ channel: string; unpublishedEntryIDs: string[] }> => {
  const snapshot = await getPublishingStatusSnapshot(input);

  return {
    channel: snapshot.channel,
    unpublishedEntryIDs: snapshot.entries
      .filter(({ hasUnpublishedChanges }) => hasUnpublishedChanges)
      .map(({ entryID }) => entryID)
  };
};

export { getPublishingStatus };
