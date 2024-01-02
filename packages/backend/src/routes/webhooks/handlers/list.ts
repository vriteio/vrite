import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { webhook, getWebhooksCollection, Webhook } from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  perPage: z.number().default(20),
  page: z.number().default(1),
  lastId: zodId().optional(),
  extensionOnly: z.boolean().optional()
});
const outputSchema = z.array(webhook.extend({ extension: z.boolean().optional() }));
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const cursor = webhooksCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {}),
      ...(input.extensionOnly && extensionId ? { extensionId: new ObjectId(extensionId) } : {})
    })
    .sort("_id", -1);

  if (!input.lastId) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  const webhooks = await cursor.limit(input.perPage).toArray();

  return webhooks.map(({ _id, workspaceId, metadata, extensionId, ...webhook }) => {
    const result: Webhook & { id: string; extension?: boolean } = {
      ...webhook,
      id: `${_id}`
    };

    if (extensionId) {
      result.extension = true;
    }

    if (metadata) {
      result.metadata = {
        ...metadata,
        contentGroupId: `${metadata.contentGroupId}`
      };
    }

    return result;
  });
};

export { inputSchema, outputSchema, handler };
