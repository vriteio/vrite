import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { webhook, getWebhooksCollection, Webhook } from "#collections";
import { errors } from "#lib/errors";

const inputSchema = webhook.pick({ id: true });
const outputSchema = webhook.omit({ secret: true }).extend({
  extension: z.boolean().describe("Whether the webhook is associated with an extension").optional()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const webhook = await webhooksCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!webhook) throw errors.notFound("webhook");

  let metadata: Webhook["metadata"] | null = null;
  let extension = false;

  if (webhook.metadata) {
    metadata = {
      ...webhook.metadata,
      contentGroupId: `${webhook.metadata.contentGroupId}`
    };
  }

  if (webhook.extensionId) {
    extension = true;
  }

  return {
    id: `${webhook._id}`,
    description: webhook.description,
    url: webhook.url,
    name: webhook.name,
    event: webhook.event,
    ...(metadata ? { metadata } : {}),
    ...(extension ? { extension } : {})
  };
};

export { inputSchema, outputSchema, handler };
