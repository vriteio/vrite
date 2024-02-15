import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getWebhooksCollection, webhook } from "#collections";
import { publishWebhookEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = webhook.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const { deletedCount } = await webhooksCollection.deleteOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!deletedCount) throw errors.notFound("webhook");

  publishWebhookEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: input
  });
};

export { inputSchema, handler };
