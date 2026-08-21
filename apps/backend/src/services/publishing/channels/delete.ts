import { publishingChannels } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { normalizePublishingChannelName } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

const deleteChannel = async (input: { workspaceID: string; name: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const name = normalizePublishingChannelName(input.name);

  await db.transaction(async (tx) => {
    const [channel] = await tx
      .select({ id: publishingChannels.id, builtIn: publishingChannels.builtIn })
      .from(publishingChannels)
      .where(
        and(eq(publishingChannels.workspaceID, workspaceID), eq(publishingChannels.name, name))
      )
      .for("update");

    if (!channel) throw new ORPCError("NOT_FOUND", { message: "Publishing channel not found" });
    if (channel.builtIn) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Built-in publishing channels cannot be deleted"
      });
    }

    await tx.delete(publishingChannels).where(eq(publishingChannels.id, channel.id));
  });
};

export { deleteChannel };
