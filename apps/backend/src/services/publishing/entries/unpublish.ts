import { entries, entryPublications, publishingChannels, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

const unpublishEntry = async (input: {
  workspaceID: string;
  entryIDs: string[];
  channel: string;
  versionID?: string;
}): Promise<boolean> => {
  const workspaceID = toUUID(input.workspaceID);
  const entryIDs = [...new Set(input.entryIDs.map(toUUID))];
  const versionID = input.versionID ? toUUID(input.versionID) : null;
  const channelCode = normalizePublishingChannelCode(input.channel);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const currentEntries = await tx
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          inArray(entries.id, entryIDs),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (currentEntries.length !== entryIDs.length) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }

    const [channel] = await tx
      .select({ id: publishingChannels.id })
      .from(publishingChannels)
      .where(
        and(
          eq(publishingChannels.workspaceID, workspaceID),
          eq(publishingChannels.code, channelCode)
        )
      );

    if (!channel) throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });

    const filters = [
      inArray(entryPublications.entryID, entryIDs),
      eq(entryPublications.channelID, channel.id)
    ];

    if (versionID) filters.push(eq(entryPublications.versionID, versionID));

    const removed = await tx
      .delete(entryPublications)
      .where(and(...filters))
      .returning({ versionID: entryPublications.versionID });

    return removed.length > 0;
  });
};

export { unpublishEntry };
