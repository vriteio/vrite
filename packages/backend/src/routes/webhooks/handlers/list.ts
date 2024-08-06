import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { webhook, getWebhooksCollection, Webhook, FullWebhook } from "#collections";
import { UnderscoreID, zodId } from "#lib/mongo";

const inputSchema = z.object({
  perPage: z.number().describe("Number of webhooks to return per page").default(20),
  page: z.number().describe("Page number to fetch").default(1),
  lastId: zodId().describe("Last webhook ID to starting fetching webhooks from").optional(),
  extensionOnly: z
    .boolean()
    .describe("Whether to only fetch webhooks associated with the extension")
    .optional()
});
const outputSchema = z.array(
  webhook.omit({ secret: true }).extend({
    extension: z
      .boolean()
      .describe("Whether the webhook is associated with an extension")
      .optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullWebhook<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId,
    ...(input.extensionOnly && extensionId ? { extensionId: new ObjectId(extensionId) } : {})
  };
  const cursor = webhooksCollection
    .find({
      ...filter,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
    })
    .sort("_id", -1);

  if (!input.lastId) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let webhooks: Array<UnderscoreID<FullWebhook<ObjectId>>> = [];

  if (input.perPage) {
    webhooks = await cursor.limit(input.perPage).toArray();
  } else {
    webhooks = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + webhooks.length;

    if (webhooks.length === input.perPage) {
      totalCount += await webhooksCollection.countDocuments(filter, { skip: totalCount });
    }
  } else {
    totalCount = webhooks.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  return webhooks.map(({ _id, workspaceId, metadata, extensionId, secret, ...webhook }) => {
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
