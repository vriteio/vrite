import { createToken } from "./tokens";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import {
  Extension,
  extension,
  contextObject,
  getExtensionsCollection,
  ContextObject,
  tokenPermission,
  getTokensCollection
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
const basePath = "/extension";
const extensionsRouter = router({
  get: authenticatedProcedure
    .input(z.object({ name: z.string() }))
    .output(extension)
    .query(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const extension = await extensionsCollection.findOne({
        name: input.name,
        workspaceId: ctx.auth.workspaceId
      });

      if (!extension) throw errors.notFound("extension");

      return {
        ...extension,
        id: `${extension._id}`
      };
    }),
  getExtension: procedure
    .meta({ openapi: { method: "GET", path: `${basePath}` } })
    .input(z.void())
    .output(extension.partial())
    .query(async ({ ctx }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;

      if (!extensionId) return {};

      const extension = await extensionsCollection.findOne({
        _id: new ObjectId(extensionId)
      });

      if (!extension) return {};

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
    .input(
      z.object({
        extension: z.object({
          name: z.string(),
          permissions: z.array(tokenPermission),
          displayName: z.string()
        })
      })
    )
    .output(zodId())
    .mutation(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const existingExtension = await extensionsCollection.findOne({
        workspaceId: ctx.auth.workspaceId,
        name: input.extension.name
      });

      if (existingExtension) {
        throw errors.alreadyExists("extension");
      }

      const _id = new ObjectId();
      const { value } = await createToken(
        {
          description: "",
          name: input.extension.displayName,
          permissions: input.extension.permissions
        },
        ctx,
        _id
      );

      await extensionsCollection.insertOne({
        _id,
        configuration: {},
        name: input.extension.name,
        workspaceId: ctx.auth.workspaceId,
        token: value
      });
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          configuration: {},
          name: input.extension.name,
          token: value,
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
      const tokensCollection = getTokensCollection(ctx.db);
      const { deletedCount } = await extensionsCollection.deleteOne({
        _id: new ObjectId(input.id)
      });

      if (!deletedCount) {
        throw errors.notFound("extension");
      }

      await tokensCollection.deleteOne({
        extensionId: new ObjectId(input.id)
      });
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: { id: input.id }
      });
    })
});

export { extensionsRouter };
