import { getCurrentDocumentContent } from "#backend/collaboration";

const SNAPSHOT_BATCH_SIZE = 20;
const syncEntrySnapshots = async (workspaceID: string, entryIDs: string[]): Promise<void> => {
  for (let index = 0; index < entryIDs.length; index += SNAPSHOT_BATCH_SIZE) {
    await Promise.all(
      entryIDs.slice(index, index + SNAPSHOT_BATCH_SIZE).map((entryID) => {
        return getCurrentDocumentContent(entryID, workspaceID);
      })
    );
  }
};

export { syncEntrySnapshots };
