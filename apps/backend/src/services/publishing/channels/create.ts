import { publishingChannels } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapPublishingChannel, type PublishingChannel } from "#backend/lib/data";
import { normalizePublishingChannelName } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";

const createChannel = async (input: {
  workspaceID: string;
  name: string;
}): Promise<PublishingChannel> => {
  const name = normalizePublishingChannelName(input.name);
  const [channel] = await db
    .insert(publishingChannels)
    .values({ workspaceID: toUUID(input.workspaceID), name })
    .onConflictDoNothing({
      target: [publishingChannels.workspaceID, publishingChannels.name]
    })
    .returning();

  if (!channel) {
    throw new ORPCError("CONFLICT", { message: "A publishing channel with this name exists" });
  }

  return mapPublishingChannel(channel);
};

export { createChannel };
