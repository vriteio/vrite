import axios from "axios";
import { z } from "zod";
import { ObjectId } from "mongodb";
import crypto from "node:crypto";
import { UnderscoreID, zodId } from "#lib/mongo";
import { AuthenticatedContext } from "#lib/middleware";
import {
  WebhookEventName,
  getWebhooksCollection,
  contentGroup,
  contentPiece,
  getContentGroupsCollection,
  workspaceMembership,
  ContentPiece,
  FullContentPiece
} from "#collections";
import { createPlugin } from "#lib/plugin";

const webhookPayload = z.union([
  contentPiece.extend({ slug: z.string() }),
  contentGroup,
  workspaceMembership.extend({ id: zodId() })
]);
const generateWebhookSignature = (
  secret: string,
  url: string,
  params: Record<string, any>
): string => {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  return crypto.createHmac("sha1", secret).update(Buffer.from(data, "utf-8")).digest("base64");
};
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
      const parsedPayload = webhookPayload.parse(payload);

      await axios.post(webhook.url, parsedPayload, {
        headers: {
          ...(webhook.extensionId && { "X-Vrite-Extension-ID": `${webhook.extensionId}` }),
          ...(webhook.secret && {
            "X-Vrite-Signature": generateWebhookSignature(
              webhook.secret,
              webhook.url,
              parsedPayload
            )
          })
        }
      });
    } catch (error) {
      ctx.fastify.log.error("Failed to run webhook", error);
    }
  }
};
const webhooksPlugin = createPlugin(async (fastify) => {
  const contentPieceWebhookPayload = (
    contentPiece: UnderscoreID<FullContentPiece<ObjectId>>
  ): ContentPiece & { id: string } => {
    return {
      ...contentPiece,
      id: `${contentPiece._id}`,
      tags: contentPiece.tags.map((tag) => `${tag}`),
      members: contentPiece.members?.map((member) => `${member}`) || [],
      contentGroupId: `${contentPiece.contentGroupId}`,
      date: contentPiece.date?.toISOString()
    };
  };

  fastify.routeCallbacks.register("contentPieces.create", (ctx, data) => {
    runWebhooks(ctx, "contentPieceAdded", contentPieceWebhookPayload(data.contentPiece));
  });
  fastify.routeCallbacks.register("contentPieces.delete", (ctx, data) => {
    runWebhooks(ctx, "contentPieceRemoved", contentPieceWebhookPayload(data.contentPiece));
  });
  fastify.routeCallbacks.register("contentPieces.move", (ctx, data) => {
    if (!data.contentPiece.contentGroupId.equals(data.updatedContentPiece.contentGroupId)) {
      runWebhooks(ctx, "contentPieceRemoved", contentPieceWebhookPayload(data.contentPiece));
      runWebhooks(ctx, "contentPieceAdded", contentPieceWebhookPayload(data.updatedContentPiece));
    }
  });
  fastify.routeCallbacks.register("contentPieces.update", (ctx, data) => {
    if (data.contentPiece.contentGroupId.equals(data.updatedContentPiece.contentGroupId)) {
      runWebhooks(ctx, "contentPieceUpdated", contentPieceWebhookPayload(data.updatedContentPiece));
    } else {
      runWebhooks(ctx, "contentPieceRemoved", contentPieceWebhookPayload(data.contentPiece));
      runWebhooks(ctx, "contentPieceAdded", contentPieceWebhookPayload(data.updatedContentPiece));
    }
  });
  fastify.routeCallbacks.register("contentGroups.create", (ctx, data) => {
    runWebhooks(ctx, "contentGroupAdded", {
      name: data.contentGroup.name,
      id: `${data.contentGroup._id}`,
      ancestors: data.contentGroup.ancestors.map((id) => `${id}`),
      descendants: data.contentGroup.descendants.map((id) => `${id}`)
    });
  });
  fastify.routeCallbacks.register("contentGroups.delete", (ctx, data) => {
    runWebhooks(ctx, "contentGroupRemoved", {
      name: data.contentGroup.name,
      id: `${data.contentGroup._id}`,
      ancestors: data.contentGroup.ancestors.map((id) => `${id}`),
      descendants: data.contentGroup.descendants.map((id) => `${id}`)
    });
  });
  fastify.routeCallbacks.register("contentGroups.move", (ctx, data) => {
    runWebhooks(ctx, "contentGroupMoved", {
      id: `${data.updatedContentGroup._id}`,
      ancestors: data.updatedContentGroup.ancestors.map((id) => `${id}`),
      descendants: data.updatedContentGroup.descendants.map((id) => `${id}`),
      name: data.updatedContentGroup.name
    });
  });
  fastify.routeCallbacks.register("verification.verifyWorkspaceInvite", (ctx, data) => {
    runWebhooks(ctx, "memberAdded", {
      ...data.workspaceMembership,
      id: `${data.workspaceMembership._id}`,
      userId: `${data.workspaceMembership.userId}`,
      roleId: `${data.workspaceMembership.roleId}`
    });
  });
  fastify.routeCallbacks.register(
    ["workspaceMemberships.leave", "workspaceMemberships.delete"],
    (ctx, data) => {
      runWebhooks(ctx, "memberRemoved", {
        ...data.workspaceMembership,
        id: `${data.workspaceMembership._id}`,
        userId: `${data.workspaceMembership.userId}`,
        roleId: `${data.workspaceMembership.roleId}`
      });
    }
  );
  fastify.routeCallbacks.register("workspaceMemberships.sendInvite", (ctx, data) => {
    runWebhooks(ctx, "memberInvited", {
      ...data.workspaceMembership,
      id: `${data.workspaceMembership._id}`,
      userId: `${data.workspaceMembership.userId}`,
      roleId: `${data.workspaceMembership.roleId}`
    });
  });
});

export { webhooksPlugin };
