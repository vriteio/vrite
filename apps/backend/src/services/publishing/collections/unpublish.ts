import { collections, entryPublications, publishingChannels } from "#backend/db";
import {
  getSubtreeEntryIDs,
  isCollectionPublishingEnabled,
  lockPublishingEntries,
  loadPublishingTree,
  normalizePublishingChannelCode
} from "#backend/lib/publishing";
import type { PublishingEntryStatus } from "#backend/lib/publishing";
import { toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { loadEntryAuthorizationSources, withAuthorization } from "#backend/lib/policy";

interface UnpublishCollectionInput {
  collectionIDs: string[];
  channel: string;
}
interface UnpublishCollectionResult {
  publishingEntries: PublishingEntryStatus[];
  unpublishedEntries: number;
}

const unpublishCollection = withAuthorization<
  UnpublishCollectionInput,
  undefined,
  UnpublishCollectionResult
>(
  {
    actions: ({ input }) => ({
      collections: input.collectionIDs.map((collectionID) => ({
        action: "publishing:unpublish-tree",
        collectionID
      }))
    }),
    tree: true,
    transaction: "locked-workspace"
  },
  async ({ authorization, database, input, workspaceID }) => {
    const collectionIDs = [...new Set(input.collectionIDs.map(toUUID))];
    const channelCode = normalizePublishingChannelCode(input.channel);

    const currentCollections = await database
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          inArray(collections.id, collectionIDs),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    if (currentCollections.length !== collectionIDs.length) {
      throw new ORPCError("NOT_FOUND", { message: "Collection not found" });
    }

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

    const tree = await loadPublishingTree(database, workspaceID);
    const subtreeEntryIDs = [
      ...new Set(
        (
          await Promise.all(
            collectionIDs.map((id) => getSubtreeEntryIDs(database, workspaceID, tree, id))
          )
        ).flat()
      )
    ];
    const entrySources = await loadEntryAuthorizationSources({
      database,
      entryIDs: subtreeEntryIDs,
      workspaceID
    });
    const authorizedSources = entrySources.filter(({ collectionID }) => {
      return authorization.canEntry(collectionID, "publishing:unpublish");
    });
    const entryIDs = authorizedSources.map(({ id }) => id);

    if (entryIDs.length === 0) {
      return { publishingEntries: [], unpublishedEntries: 0 };
    }

    await lockPublishingEntries(database, workspaceID, entryIDs);

    const removed = await database
      .delete(entryPublications)
      .where(
        and(
          eq(entryPublications.workspaceID, workspaceID),
          eq(entryPublications.channelID, channel.id),
          inArray(entryPublications.entryID, entryIDs)
        )
      )
      .returning({ entryID: entryPublications.entryID });

    const collectionIDByEntryID = new Map(
      authorizedSources.map((entry) => [entry.id, entry.collectionID || null])
    );

    return {
      publishingEntries: entryIDs.map((entryID) => ({
        entryID: toEntryID(entryID),
        hasUnpublishedChanges: isCollectionPublishingEnabled(
          tree,
          collectionIDByEntryID.get(entryID) || null
        ),
        versionID: null
      })),
      unpublishedEntries: removed.length
    };
  }
);

export { unpublishCollection };
