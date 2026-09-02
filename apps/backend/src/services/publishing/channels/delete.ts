import { publishingChannels } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

interface DeleteChannelInput {
  code: string;
}
interface DeleteChannelResult {
  channelID: string;
}

const deleteChannel = withAuthorization<DeleteChannelInput, undefined, DeleteChannelResult>(
  {
    permissions: { session: ["publishing"], key: ["publishing"] },
    transaction: "atomic"
  },
  async ({ database, input, workspaceID }) => {
    const code = normalizePublishingChannelCode(input.code);

    const [channel] = await database
      .select({ id: publishingChannels.id, builtIn: publishingChannels.builtIn })
      .from(publishingChannels)
      .where(
        and(eq(publishingChannels.workspaceID, workspaceID), eq(publishingChannels.code, code))
      )
      .for("update");

    if (!channel) throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });
    if (channel.builtIn) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Built-in publishing channels cannot be deleted"
      });
    }

    await database.delete(publishingChannels).where(eq(publishingChannels.id, channel.id));

    return { channelID: channel.id };
  }
);

export { deleteChannel };
