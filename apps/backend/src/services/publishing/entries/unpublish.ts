import { entryPublications, publishingChannels } from "#backend/db";
import {
  lockPublishingEntries,
  normalizePublishingChannelCode,
  type PublishingEntryStatus
} from "#backend/lib/publishing";
import { toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  type EntryAuthorizationSource,
  loadEntryAuthorizationSources,
  withAuthorization
} from "#backend/lib/policy";

interface UnpublishEntryInput {
  entryIDs: string[];
  channel: string;
  versionID?: string;
}
interface UnpublishEntryResult {
  publishingEntries: PublishingEntryStatus[];
  removed: boolean;
}

const unpublishEntry = withAuthorization<
  UnpublishEntryInput,
  EntryAuthorizationSource[],
  UnpublishEntryResult
>(
  {
    actions: ({ resolved }) => ({
      entries: resolved.map(({ collectionID }) => ({
        action: "publishing:unpublish",
        collectionID
      }))
    }),
    resolve: ({ database, input, workspaceID }) => {
      return loadEntryAuthorizationSources({ database, entryIDs: input.entryIDs, workspaceID });
    },
    tree: true,
    transaction: "locked-workspace"
  },
  async ({ authorization, database, input, resolved, workspaceID }) => {
    const entryIDs = [...new Set(input.entryIDs.map(toUUID))];
    const versionID = input.versionID ? toUUID(input.versionID) : null;
    const channelCode = normalizePublishingChannelCode(input.channel);

    const [channel] = await database
      .select({ id: publishingChannels.id })
      .from(publishingChannels)
      .where(
        and(
          eq(publishingChannels.workspaceID, workspaceID),
          eq(publishingChannels.code, channelCode)
        )
      );

    if (!channel) throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });

    await lockPublishingEntries(database, workspaceID, entryIDs);

    const filters = [
      inArray(entryPublications.entryID, entryIDs),
      eq(entryPublications.channelID, channel.id)
    ];

    if (versionID) filters.push(eq(entryPublications.versionID, versionID));

    const removed = await database
      .delete(entryPublications)
      .where(and(...filters))
      .returning({ versionID: entryPublications.versionID });

    return {
      publishingEntries: resolved.map((entry) => ({
        entryID: toEntryID(entry.id),
        hasUnpublishedChanges: authorization.isPublishingEnabled(entry.collectionID),
        versionID: null
      })),
      removed: removed.length > 0
    };
  }
);

export { unpublishEntry };
