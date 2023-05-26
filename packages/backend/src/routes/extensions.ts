import { z } from "zod";
import { ObjectId } from "mongodb";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import {
  Extension,
  extension,
  contextObject,
  getExtensionsCollection,
  ContextObject
} from "#database";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import * as errors from "#lib/errors";
import { zodId } from "#lib";

type ExtensionEvent =
  | { action: "delete"; data: { id: string } }
  | { action: "create"; data: Extension & { id: string } }
  | { action: "update"; data: { id: string; configuration: ContextObject } };

const publishEvent = createEventPublisher<ExtensionEvent>((workspaceId) => {
  return `extensions:${workspaceId}`;
});
const authenticatedProcedure = procedure.use(isAuthenticated);
const extensionsRouter = router({
  get: authenticatedProcedure
    .input(z.object({ extensionId: z.string() }))
    .output(extension)
    .query(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const extension = await extensionsCollection.findOne({
        extensionId: input.extensionId,
        workspaceId: ctx.auth.workspaceId
      });

      if (!extension) throw errors.notFound("extension");

      return {
        ...extension,
        id: `${extension._id}`
      };
    }),
  list: authenticatedProcedure
    .input(
      z
        .object({
          perPage: z.number().default(20),
          page: z.number().default(1)
        })
        .default({})
    )
    .output(z.array(extension))
    .query(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const extensions = await extensionsCollection
        .find({
          workspaceId: ctx.auth.workspaceId
        })
        .sort({ _id: -1 })
        .skip((input.page - 1) * input.perPage)
        .limit(input.perPage)
        .toArray();

      return extensions.map(({ _id, workspaceId, ...extension }) => ({
        ...extension,
        id: `${_id}`
      }));
    }),
  changes: authenticatedProcedure.input(z.void()).subscription(({ ctx }) => {
    return createEventSubscription<ExtensionEvent>(ctx, `extensions:${ctx.auth.workspaceId}`);
  }),
  install: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] }
    })
    .input(z.object({ extensionId: z.string(), configuration: contextObject }))
    .output(zodId())
    .mutation(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const existingExtension = await extensionsCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        extensionId: input.extensionId
      });

      if (existingExtension) {
        throw errors.alreadyExists("extension");
      }

      const _id = new ObjectId();

      await extensionsCollection.insertOne({
        _id,
        configuration: input.configuration,
        extensionId: input.extensionId,
        workspaceId: ctx.auth.workspaceId
      });
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          configuration: input.configuration,
          extensionId: input.extensionId,
          id: `${_id}`
        }
      });

      return `${_id}`;
    }),
  configure: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] }
    })
    .input(
      z.object({
        id: zodId(),
        configuration: contextObject
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const { matchedCount } = await extensionsCollection.updateOne(
        { _id: new ObjectId(input.id) },
        {
          $set: {
            configuration: input.configuration
          }
        }
      );

      if (!matchedCount) {
        throw errors.notFound("extension");
      }

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          id: input.id,
          configuration: input.configuration
        }
      });
    }),
  uninstall: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const { deletedCount } = await extensionsCollection.deleteOne({
        _id: new ObjectId(input.id)
      });

      if (!deletedCount) {
        throw errors.notFound("extension");
      }

      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: { id: input.id }
      });
    })
});

export { extensionsRouter };
