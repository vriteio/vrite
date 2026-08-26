import { publishingChannels } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { mapPublishingChannel, type PublishingChannel } from "#backend/lib/data";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";

const createChannel = async (input: {
  workspaceID: string;
  name: string;
}): Promise<PublishingChannel> => {
  const name = input.name.trim();
  const code = normalizePublishingChannelCode(name);
  const [channel] = await db
    .insert(publishingChannels)
    .values({ workspaceID: toUUID(input.workspaceID), code, name })
    .onConflictDoNothing({
      target: [publishingChannels.workspaceID, publishingChannels.code]
    })
    .returning();

  if (!channel) {
    throw new ORPCError("CONFLICT", { message: "A publishing channel with this code exists" });
  }

  return mapPublishingChannel(channel);
};

export { createChannel };
