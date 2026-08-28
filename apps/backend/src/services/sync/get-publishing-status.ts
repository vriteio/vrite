import { getPublishingStatusSnapshot } from "#backend/lib/publishing";
import { entries } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { toEntryID, toUUID } from "#backend/lib/primitives";
import { and, eq, inArray, isNull } from "drizzle-orm";

interface GetPublishingStatusInput {
  channel: string;
}

const getPublishingStatus = withAuthorization<
  GetPublishingStatusInput,
  undefined,
  { channel: string; unpublishedEntryIDs: string[] }
>({ tree: true }, async ({ authorization, database, input, workspaceID }) => {
  const snapshot = await getPublishingStatusSnapshot({
    workspaceID,
    channel: input.channel
  });
  const unpublishedEntryIDs = snapshot.entries
    .filter(({ hasUnpublishedChanges }) => hasUnpublishedChanges)
    .map(({ entryID }) => entryID);
  const rows = unpublishedEntryIDs.length
    ? await database
        .select({ collectionID: entries.collectionID, id: entries.id })
        .from(entries)
        .where(
          and(
            eq(entries.workspaceID, workspaceID),
            inArray(entries.id, unpublishedEntryIDs.map(toUUID)),
            isNull(entries.deletedAt)
          )
        )
    : [];

  return {
    channel: snapshot.channel,
    unpublishedEntryIDs: rows
      .filter(({ collectionID }) => authorization.canEntry(collectionID, "publishing:read"))
      .map(({ id }) => toEntryID(id))
  };
});

export { getPublishingStatus };
