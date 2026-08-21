import { emitPublishingEntryUpdates } from "#backend/events/publishing";
import { PUBLISHED_CHANNEL_NAME } from "./config";
import { getPublishingStatusSnapshot } from "./status";

const emitPublishingStatusUpdates = async (input: {
  workspaceID: string;
  entryIDs: string[];
  channel?: string;
  memberID?: string;
}): Promise<void> => {
  const channel = input.channel || PUBLISHED_CHANNEL_NAME;

  try {
    const snapshot = await getPublishingStatusSnapshot({
      workspaceID: input.workspaceID,
      channel,
      entryIDs: input.entryIDs
    });

    emitPublishingEntryUpdates(input.workspaceID, snapshot.entries, input.memberID, channel);
  } catch (error) {
    console.error("Failed to emit publishing status updates", {
      error,
      entryIDs: input.entryIDs,
      workspaceID: input.workspaceID
    });
  }
};

export { emitPublishingStatusUpdates };
