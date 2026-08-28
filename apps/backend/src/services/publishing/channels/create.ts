import { publishingChannels } from "#backend/db";
import { mapPublishingChannel, type PublishingChannel } from "#backend/lib/data";
import { withAuthorization } from "#backend/lib/policy";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { ORPCError } from "@orpc/server";

interface CreateChannelInput {
  name: string;
}

const createChannel = withAuthorization<CreateChannelInput, undefined, PublishingChannel>(
  {
    permissions: { session: ["publishing"], key: ["publishing"] },
    transaction: "atomic"
  },
  async ({ database, input, workspaceID }) => {
    const name = input.name.trim();
    const code = normalizePublishingChannelCode(name);

    const [channel] = await database
      .insert(publishingChannels)
      .values({ workspaceID, code, name })
      .onConflictDoNothing({
        target: [publishingChannels.workspaceID, publishingChannels.code]
      })
      .returning();

    if (!channel) {
      throw new ORPCError("CONFLICT", { message: "A publishing channel with this code exists" });
    }

    return mapPublishingChannel(channel);
  }
);

export { createChannel };
