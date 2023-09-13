import { z } from "zod";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import { Transformer, getGitDataCollection, transformer } from "#database";
import { ObjectId, zodId } from "#lib/mongo";
import { getTransformersCollection } from "#database/transformers";

type TransformersEvent =
  | {
      action: "create";
      data: Transformer & { id: string };
    }
  | {
      action: "delete";
      data: { id: string };
    };

const publishEvent = createEventPublisher<TransformersEvent>(
  (workspaceId) => `transformers:${workspaceId}`
);
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
      const transformersCollection = getTransformersCollection(ctx.db);
      const transformer = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        ...input
      };

      await transformersCollection.insertOne(transformer);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
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

      publishEvent(ctx, `${ctx.auth.workspaceId}`, { action: "delete", data: input });
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["workspace:read"] }
    })
    .input(z.void())
    .output(z.array(transformer.extend({ inUse: z.boolean().optional() })))
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

      return transformers.map(({ _id, workspaceId, ...transformerData }) => {
        return {
          id: `${_id}`,
          workspaceId: `${workspaceId}`,
          inUse: gitData?.github?.transformer === `${_id}`,
          ...transformerData
        };
      });
    }),

  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return createEventSubscription<TransformersEvent>(ctx, `transformers:${ctx.auth.workspaceId}`);
  })
});

export { transformersRouter };
export type { TransformersEvent };
