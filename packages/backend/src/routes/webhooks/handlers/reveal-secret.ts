import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { webhook, getWebhooksCollection } from "#collections";
import { errors } from "#lib/errors";

const inputSchema = webhook.pick({ id: true });
const outputSchema = webhook.pick({ secret: true });
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

  return {
    secret: webhook.secret
  };
};

export { inputSchema, outputSchema, handler };
