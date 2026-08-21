import { collections, entryPublications, publishingChannels, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  getSubtreeEntryIDs,
  loadPublishingTree,
  normalizePublishingChannelName
} from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

const unpublishCollection = async (input: {
  workspaceID: string;
  collectionID: string;
  channel: string;
}): Promise<{ entryIDs: string[]; unpublishedEntries: number }> => {
  const workspaceID = toUUID(input.workspaceID);
  const collectionID = toUUID(input.collectionID);
  const channelName = normalizePublishingChannelName(input.channel);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [collection] = await tx
      .select({ id: collections.id })
      .from(collections)
      .where(
        and(
          eq(collections.id, collectionID),
          eq(collections.workspaceID, workspaceID),
          isNull(collections.deletedAt)
        )
      );

    if (!collection) throw new ORPCError("NOT_FOUND", { message: "Collection not found" });

    const [channel] = await tx
      .select({ id: publishingChannels.id })
      .from(publishingChannels)
      .where(
        and(
          eq(publishingChannels.workspaceID, workspaceID),
          eq(publishingChannels.name, channelName)
        )
      );

    if (!channel) throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });

    const tree = await loadPublishingTree(tx, workspaceID);
    const entryIDs = await getSubtreeEntryIDs(tx, workspaceID, tree, collectionID);

    if (entryIDs.length === 0) return { entryIDs, unpublishedEntries: 0 };

    const removed = await tx
      .delete(entryPublications)
      .where(
        and(
          eq(entryPublications.workspaceID, workspaceID),
          eq(entryPublications.channelID, channel.id),
          inArray(entryPublications.entryID, entryIDs)
        )
      )
      .returning({ entryID: entryPublications.entryID });

    return { entryIDs, unpublishedEntries: removed.length };
  });
};

export { unpublishCollection };
