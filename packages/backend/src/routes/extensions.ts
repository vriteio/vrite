import { createToken } from "./tokens";
import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  extension,
  contextObject,
  getExtensionsCollection,
  tokenPermission,
  getTokensCollection,
  getContentPiecesCollection
} from "#database";
import { zodId, errors, procedure, router, isAuthenticated, isEnabled } from "#lib";
import { publishExtensionEvent, subscribeToExtensionEvents } from "#events/extension";
import { publishContentPieceEvent } from "#events";

const authenticatedProcedure = procedure.use(isAuthenticated).use(isEnabled);
const basePath = "/extension";
const extensionsRouter = router({
  get: authenticatedProcedure
    .meta({
      requiredConfig: ["extensions"]
    })
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
    .meta({ openapi: { method: "GET", path: `${basePath}` }, requiredConfig: ["extensions"] })
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
  updateContentPieceData: authenticatedProcedure
    .meta({
      openapi: {
        method: "PUT",
        path: `${basePath}/content-piece-data`
      },
      requiredConfig: ["extensions"]
    })
    .input(
      z.object({
        contentPieceId: zodId(),
        extensionId: zodId().optional(),
        data: z.any()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const extensionId = input.extensionId || ctx.req.headers["x-vrite-extension-id"];
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const contentPiecesCollection = getContentPiecesCollection(ctx.db);

      if (!extensionId || typeof extensionId !== "string") throw errors.invalid("extensionId");

      const extension = await extensionsCollection.findOne({
        _id: new ObjectId(extensionId),
        workspaceId: ctx.auth.workspaceId
      });

      if (!extension) throw errors.notFound("extension");

      const contentPiece = await contentPiecesCollection.findOne({
        _id: new ObjectId(input.contentPieceId),
        workspaceId: ctx.auth.workspaceId
      });

      if (!contentPiece) throw errors.notFound("content piece");

      await contentPiecesCollection.updateOne(
        {
          _id: new ObjectId(input.contentPieceId)
        },
        {
          $set: {
            [`customData.__extensions__.${extension.name}`]: input.data
          }
        }
      );
      publishContentPieceEvent(ctx, `${contentPiece.contentGroupId}`, {
        action: "update",
        userId: `${ctx.auth.userId}`,
        data: {
          id: `${contentPiece._id}`,
          customData: {
            ...contentPiece.customData,
            __extensions__: {
              ...(contentPiece.customData?.__extensions__ || {}),
              [extension.name]: input.data
            }
          }
        }
      });
    }),
  list: authenticatedProcedure
    .meta({
      requiredConfig: ["extensions"]
    })
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
    return subscribeToExtensionEvents(ctx, `${ctx.auth.workspaceId}`);
  }),
  install: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] },
      requiredConfig: ["extensions"]
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
    .output(
      z.object({
        id: zodId(),
        token: z.string()
      })
    )
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
        config: {},
        name: input.extension.name,
        workspaceId: ctx.auth.workspaceId,
        token: value
      });
      publishExtensionEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: {
          config: {},
          name: input.extension.name,
          token: value,
          id: `${_id}`
        }
      });

      return { id: `${_id}`, token: value };
    }),
  configure: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] },
      requiredConfig: ["extensions"]
    })
    .input(
      z.object({
        id: zodId(),
        config: contextObject
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const extensionsCollection = getExtensionsCollection(ctx.db);
      const { matchedCount } = await extensionsCollection.updateOne(
        { _id: new ObjectId(input.id) },
        {
          $set: {
            config: input.config
          }
        }
      );

      if (!matchedCount) {
        throw errors.notFound("extension");
      }

      publishExtensionEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "update",
        data: {
          id: input.id,
          config: input.config
        }
      });
    }),
  uninstall: authenticatedProcedure
    .meta({
      permissions: { session: ["manageExtensions"] },
      requiredConfig: ["extensions"]
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
      publishExtensionEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "delete",
        data: { id: input.id }
      });
    })
});

export { extensionsRouter };
