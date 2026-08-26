import { publishingChannels } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { normalizePublishingChannelCode } from "#backend/lib/publishing";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

const deleteChannel = async (input: { workspaceID: string; code: string }): Promise<void> => {
  const workspaceID = toUUID(input.workspaceID);
  const code = normalizePublishingChannelCode(input.code);

  await db.transaction(async (tx) => {
    const [channel] = await tx
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

    await tx.delete(publishingChannels).where(eq(publishingChannels.id, channel.id));
  });
};

export { deleteChannel };
