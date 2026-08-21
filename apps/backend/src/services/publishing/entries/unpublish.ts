import { entries, entryPublications, publishingChannels, workspaces } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { normalizePublishingChannelName } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

const unpublishEntry = async (input: {
  workspaceID: string;
  entryID: string;
  channel: string;
}): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const entryID = toUUID(input.entryID);
  const channelName = normalizePublishingChannelName(input.channel);

  await db.transaction(async (tx) => {
    const [workspace] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceID))
      .for("update");

    if (!workspace) throw new ORPCError("NOT_FOUND", { message: "Workspace not found" });

    const [entry] = await tx
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

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

    await tx
      .delete(entryPublications)
      .where(
        and(eq(entryPublications.entryID, entryID), eq(entryPublications.channelID, channel.id))
      );
  });
};

export { unpublishEntry };
