import { ObjectId } from "mongodb";
import { z } from "zod";
import { procedure, router } from "#lib/trpc";
import { isAuthenticated } from "#lib/middleware";
import { UnderscoreID, zodId } from "#lib/mongo";
import { FullWebhook, Webhook, getWebhooksCollection, webhook } from "#database/webhooks";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type WebhookEvent =
  | {
      action: "create";
      data: Webhook & { id: string };
    }
  | {
      action: "update";
      data: Partial<Webhook> & { id: string };
    }
  | {
      action: "delete";
      data: { id: string };
    };

const publishEvent = createEventPublisher<WebhookEvent>((workspaceId) => {
  return `webhooks:${workspaceId}`;
});
const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/webhooks";
const webhooksRouter = router({
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["webhooks:read"] }
    })
    .input(
      z.object({
        perPage: z.number().default(20),
        page: z.number().default(1),
        lastId: zodId().optional()
      })
    )
    .output(z.array(webhook))
    .query(async ({ ctx, input }) => {
      const webhooksCollection = getWebhooksCollection(ctx.db);
      const cursor = webhooksCollection
        .find({
          workspaceId: ctx.auth.workspaceId,
          ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
        })
        .sort("_id", -1);

      if (!input.lastId) {
        cursor.skip((input.page - 1) * input.perPage);
      }

      const webhooks = await cursor.limit(input.perPage).toArray();

      return webhooks.map(({ _id, workspaceId, metadata, ...webhook }) => {
        const result: Webhook & { id: string } = {
          ...webhook,
          id: `${_id}`
        };

        if (metadata) {
          result.metadata = {
            ...metadata,
            contentGroupId: `${metadata.contentGroupId}`
          };
        }

        return result;
      });
    }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["webhooks:read"] }
    })
    .input(z.object({ id: z.string() }))
    .output(webhook)
    .query(async ({ ctx, input }) => {
      const webhooksCollection = getWebhooksCollection(ctx.db);
      const webhook = await webhooksCollection.findOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!webhook) throw errors.notFound("webhook");

      let metadata: Webhook["metadata"] | null = null;

      if (webhook.metadata) {
        metadata = {
          ...webhook.metadata,
          contentGroupId: `${webhook.metadata.contentGroupId}`
        };
      }

      return {
        id: `${webhook._id}`,
        description: webhook.description,
        url: webhook.url,
        name: webhook.name,
        event: webhook.event,
        ...(metadata ? { metadata } : {})
      };
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(webhook.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const webhooksCollection = getWebhooksCollection(ctx.db);
      const { metadata, ...create } = input;
      const webhook: UnderscoreID<FullWebhook<ObjectId>> = {
        ...create,
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId
      };

      if (metadata) {
        webhook.metadata = {
          contentGroupId: new ObjectId(metadata.contentGroupId)
        };
      } else if (webhook.event.startsWith("contentPiece")) throw errors.serverError();

      await webhooksCollection.insertOne(webhook);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: { ...input, id: `${webhook._id}` }
      });

      return { id: `${webhook._id}` };
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return createEventSubscription<WebhookEvent>(ctx, `webhooks:${ctx.auth.workspaceId}`);
  }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(webhook.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
        { _id: new ObjectId(input.id) },
        {
          $set: {
            ...update,
            ...(metadata ? { metadata: modifiedMetadata || undefined } : {})
          }
        }
      );

      if (!matchedCount) throw errors.notFound("webhook");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: input
      });
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(z.object({ id: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const webhooksCollection = getWebhooksCollection(ctx.db);
      const { deletedCount } = await webhooksCollection.deleteOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!deletedCount) throw errors.notFound("webhook");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: input
      });
    })
});

export { webhooksRouter };
