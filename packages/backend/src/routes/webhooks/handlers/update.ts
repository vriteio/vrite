import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { webhook, getWebhooksCollection, Webhook } from "#collections";
import { publishWebhookEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = webhook.partial().required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const { metadata, ...update } = input;

  let modifiedMetadata: Webhook<ObjectId>["metadata"] | null = null;

  if (metadata) {
    modifiedMetadata = {
      ...metadata,
      contentGroupId: new ObjectId(metadata.contentGroupId)
    };
  }

  const { matchedCount } = await webhooksCollection.updateOne(
    {
      _id: new ObjectId(input.id),
      ...(extensionId && { extensionId: new ObjectId(extensionId) })
    },
    {
      $set: {
        ...update,
        ...(metadata && { metadata: modifiedMetadata || undefined })
      }
    }
  );

  if (!matchedCount) throw errors.notFound("webhook");

  publishWebhookEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: input
  });
};

export { inputSchema, handler };
