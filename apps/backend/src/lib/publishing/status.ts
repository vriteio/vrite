import {
  contents,
  entries,
  entryPublications,
  entryVersions,
  publishingChannels
} from "#backend/db";
import { db } from "#backend/lib/adapters/postgres";
import { toCollectionID, toEntryID, toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { normalizePublishingChannelName } from "./channel";
import { isCollectionPublishingEnabled, loadPublishingTree } from "./tree";

interface PublishingEntryStatus {
  entryID: string;
  hasUnpublishedChanges: boolean;
}
interface PublishingStatusSnapshot {
  channel: string;
  enabledCollectionIDs: string[];
  entries: PublishingEntryStatus[];
}

const getPublishingStatusSnapshot = async (input: {
  workspaceID: string;
  channel: string;
  entryIDs?: string[];
}): Promise<PublishingStatusSnapshot> => {
  const workspaceID = toUUID(input.workspaceID);
  const channelName = normalizePublishingChannelName(input.channel);
  const entryIDs = input.entryIDs?.map(toUUID);

  return db.transaction(async (tx) => {
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
    const enabledCollectionIDs = tree.collections
      .filter(({ publishingEnabled }) => publishingEnabled)
      .map(({ id }) => toCollectionID(id));

    if (entryIDs?.length === 0) {
      return { channel: channelName, enabledCollectionIDs, entries: [] };
    }

    const filters = [eq(entries.workspaceID, workspaceID), isNull(entries.deletedAt)];

    if (entryIDs) filters.push(inArray(entries.id, entryIDs));

    const rows = await tx
      .select({
        entryID: entries.id,
        collectionID: entries.collectionID,
        draftHash: contents.hash,
        versionID: entryPublications.versionID,
        assignedHash: entryVersions.hash
      })
      .from(entries)
      .leftJoin(contents, eq(contents.entryID, entries.id))
      .leftJoin(
        entryPublications,
        and(eq(entryPublications.entryID, entries.id), eq(entryPublications.channelID, channel.id))
      )
      .leftJoin(entryVersions, eq(entryVersions.id, entryPublications.versionID))
      .where(and(...filters))
      .orderBy(asc(entries.id));

    return {
      channel: channelName,
      enabledCollectionIDs,
      entries: rows.map((row) => ({
        entryID: toEntryID(row.entryID),
        hasUnpublishedChanges:
          isCollectionPublishingEnabled(tree, row.collectionID) &&
          (!row.versionID || row.draftHash !== row.assignedHash)
      }))
    };
  });
};

export { getPublishingStatusSnapshot };
export type { PublishingEntryStatus, PublishingStatusSnapshot };
