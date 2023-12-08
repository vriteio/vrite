import { AuthenticatedContext } from "./middleware";
import { zodId } from "./mongo";
import axios from "axios";
import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  WebhookEventName,
  getWebhooksCollection,
  contentGroup,
  contentPiece,
  getContentGroupsCollection,
  workspaceMembership
} from "#database";

const webhookPayload = z.union([
  contentPiece.extend({ slug: z.string() }),
  contentGroup,
  workspaceMembership.extend({ id: zodId() })
]);
const runWebhooks = async (
  ctx: AuthenticatedContext,
  event: WebhookEventName,
  payload: z.infer<typeof webhookPayload>
): Promise<void> => {
  const webhooksCollection = getWebhooksCollection(ctx.db);
  const contentGroupsCollection = getContentGroupsCollection(ctx.db);
  const webhooks = await webhooksCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      event
    })
    .toArray();

  for await (const webhook of webhooks) {
    if ("contentGroupId" in payload) {
      if (!webhook.metadata?.contentGroupId) {
        continue;
      }

      const directMatch = webhook.metadata?.contentGroupId.equals(payload.contentGroupId);

      if (!directMatch) {
        const contentGroup = await contentGroupsCollection.findOne({
          _id: new ObjectId(payload.contentGroupId)
        });
        const nested = (contentGroup?.ancestors || []).find((ancestor) => {
          return ancestor.equals(webhook.metadata?.contentGroupId!);
        });

        if (!contentGroup || !nested) {
          continue;
        }
      }
    }

    try {
      await axios.post(webhook.url, webhookPayload.parse(payload), {
        ...(webhook.extensionId && {
          headers: {
            "X-Vrite-Extension-ID": `${webhook.extensionId}`
          }
        })
      });
    } catch (error) {
      ctx.fastify.log.error("Failed to run webhook", error);
    }
  }
};

export { runWebhooks };
