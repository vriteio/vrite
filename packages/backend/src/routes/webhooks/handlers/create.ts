import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { webhook, getWebhooksCollection, FullWebhook } from "#collections";
import { publishWebhookEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId, UnderscoreID } from "#lib/mongo";

const inputSchema = webhook.omit({ id: true });
const outputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const { metadata, ...create } = input;
  const webhook: UnderscoreID<FullWebhook<ObjectId>> = {
    ...create,
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    ...(extensionId && { extensionId: new ObjectId(extensionId) })
  };

  if (metadata) {
    webhook.metadata = {
      contentGroupId: new ObjectId(metadata.contentGroupId)
    };
  } else if (webhook.event.startsWith("contentPiece")) throw errors.serverError();

  await webhooksCollection.insertOne(webhook);
  publishWebhookEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: { ...input, id: `${webhook._id}` }
  });

  return { id: `${webhook._id}` };
};

export { inputSchema, outputSchema, handler };
