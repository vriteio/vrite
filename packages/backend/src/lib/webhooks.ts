import { AuthenticatedContext } from "./middleware";
import axios from "axios";
import { z } from "zod";
import { ObjectId, zodId } from "#lib/mongo";
import { WebhookEvent, getWebhooksCollection } from "#database/webhooks";
import { contentGroup, contentPiece, getContentGroupsCollection } from "#database";
import { workspaceMembership } from "#database/workspace-memberships";

const webhookPayload = z.union([
  contentPiece.extend({ id: zodId(), slug: z.string(), locked: z.boolean().optional() }),
  contentGroup.extend({ id: zodId() }),
  workspaceMembership.extend({ id: zodId() })
]);
const runWebhooks = async (
  ctx: AuthenticatedContext,
  event: WebhookEvent,
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
      // eslint-disable-next-line no-console
      console.error("Failed to run webhook", error);
    }
  }
};

export { runWebhooks };
