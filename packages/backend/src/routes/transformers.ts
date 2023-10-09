import { z } from "zod";
import { ObjectId } from "mongodb";
import { getGitDataCollection, transformer, getTransformersCollection } from "#database";
import { zodId, errors, procedure, router, isAuthenticated } from "#lib";
import { publishTransformerEvent, subscribeToTransformerEvents } from "#events";

const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/transformers";
const transformersRouter = router({
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(transformer.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;
      const transformersCollection = getTransformersCollection(ctx.db);
      const transformer = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        ...(extensionId && { extensionId: new ObjectId(extensionId) }),
        ...input
      };

      await transformersCollection.insertOne(transformer);
      publishTransformerEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: { ...input, id: `${transformer._id}` }
      });

      return { id: `${transformer._id}` };
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageWorkspace"], token: ["workspace:write"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const transformersCollection = getTransformersCollection(ctx.db);
      const gitDataCollection = getGitDataCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });

      if (gitData?.github?.transformer === input.id) {
        throw errors.badRequest("notAllowed");
      }

      const { deletedCount } = await transformersCollection.deleteOne({
        _id: new ObjectId(input.id),
        workspaceId: ctx.auth.workspaceId
      });

      if (!deletedCount) throw errors.notFound("transformer");

      publishTransformerEvent(ctx, `${ctx.auth.workspaceId}`, { action: "delete", data: input });
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(
      z.array(
        transformer.extend({
          inUse: z.boolean().optional(),
          extension: z.boolean().optional()
        })
      )
    )
    .query(async ({ ctx }) => {
      const gitDataCollection = getGitDataCollection(ctx.db);
      const transformersCollection = getTransformersCollection(ctx.db);
      const gitData = await gitDataCollection.findOne({
        workspaceId: ctx.auth.workspaceId
      });
      const transformers = await transformersCollection
        .find({
          workspaceId: ctx.auth.workspaceId
        })
        .sort("_id", -1)
        .toArray();

      return transformers.map(({ _id, workspaceId, extensionId, ...transformerData }) => {
        return {
          id: `${_id}`,
          workspaceId: `${workspaceId}`,
          inUse: gitData?.github?.transformer === `${_id}`,
          ...(extensionId && { extension: true }),
          ...transformerData
        };
      });
    }),

  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return subscribeToTransformerEvents(ctx, `${ctx.auth.workspaceId}`);
  })
});

export { transformersRouter };
