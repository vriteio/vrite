import { ObjectId } from "mongodb";
import { z } from "zod";
import { FullWebhook, Webhook, getWebhooksCollection, webhook } from "#database";
import { errors, isAuthenticated, UnderscoreID, zodId, procedure, router } from "#lib";
import { publishWebhookEvent, subscribeToWebhookEvents } from "#events";

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
        lastId: zodId().optional(),
        extensionOnly: z.boolean().optional()
      })
    )
    .output(z.array(webhook.extend({ extension: z.boolean().optional() })))
    .query(async ({ ctx, input }) => {
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
    }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: basePath, protect: true },
      permissions: { token: ["webhooks:read"] }
    })
    .input(z.object({ id: z.string() }))
    .output(webhook.extend({ extension: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
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
    }),
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(webhook.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
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
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return subscribeToWebhookEvents(ctx, `${ctx.auth.workspaceId}`);
  }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(webhook.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWebhooks"], token: ["webhooks:write"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const webhooksCollection = getWebhooksCollection(ctx.db);
      const { deletedCount } = await webhooksCollection.deleteOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!deletedCount) throw errors.notFound("webhook");

      publishWebhookEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: input
      });
    })
});

export { webhooksRouter };
