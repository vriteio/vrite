import { z } from "zod";
import { isAuthenticated } from "#lib/middleware";
import { procedure, router } from "#lib/trpc";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";
import {
  Variant,
  getContentPieceVariantsCollection,
  getContentVariantsCollection,
  getVariantsCollection,
  variant
} from "#database";
import { ObjectId, zodId } from "#lib/mongo";

type VariantsEvent =
  | {
      action: "create";
      data: Variant & { id: string };
    }
  | {
      action: "update";
      data: Partial<Variant> & { id: string };
    }
  | {
      action: "delete";
      data: { id: string };
    };

const publishEvent = createEventPublisher<VariantsEvent>(
  (workspaceId) => `variants:${workspaceId}`
);
const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/variants";
const variantsRouter = router({
  create: authenticatedProcedure
    .meta({
      openapi: { method: "POST", path: basePath, protect: true },
      permissions: { session: ["manageVariants"], token: ["variants:write"] }
    })
    .input(variant.omit({ id: true }))
    .output(z.object({ id: zodId() }))
    .mutation(async ({ ctx, input }) => {
      const variantsCollection = getVariantsCollection(ctx.db);
      const variant = {
        _id: new ObjectId(),
        workspaceId: ctx.auth.workspaceId,
        ...input
      };

      await variantsCollection.insertOne(variant);
      publishEvent(ctx, `${ctx.auth.workspaceId}`, {
        action: "create",
        data: { ...input, id: `${variant._id}` }
      });

      return { id: `${variant._id}` };
    }),
  update: authenticatedProcedure
    .meta({
      openapi: { method: "PUT", path: basePath, protect: true },
      permissions: { session: ["manageVariants"], token: ["variants:write"] }
    })
    .input(variant.partial().required({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const variantsCollection = getVariantsCollection(ctx.db);
      const { id, ...update } = input;
      const { matchedCount } = await variantsCollection.updateOne(
        { _id: new ObjectId(id), workspaceId: ctx.auth.workspaceId },
        { $set: update }
      );

      if (!matchedCount) throw errors.notFound("variant");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, { action: "update", data: input });
    }),
  delete: authenticatedProcedure
    .meta({
      openapi: { method: "DELETE", path: basePath, protect: true },
      permissions: { session: ["manageVariants"], token: ["variants:write"] }
    })
    .input(z.object({ id: zodId() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const variantsCollection = getVariantsCollection(ctx.db);
      const contentPieceVariantsCollection = getContentPieceVariantsCollection(ctx.db);
      const contentVariantsCollection = getContentVariantsCollection(ctx.db);
      const variantId = new ObjectId(input.id);
      const { deletedCount } = await variantsCollection.deleteOne({
        _id: variantId,
        workspaceId: ctx.auth.workspaceId
      });

      await contentPieceVariantsCollection.deleteMany({
        workspaceId: ctx.auth.workspaceId,
        variantId
      });
      await contentVariantsCollection.deleteMany({
        variantId
      });

      if (!deletedCount) throw errors.notFound("variant");

      publishEvent(ctx, `${ctx.auth.workspaceId}`, { action: "delete", data: input });
      ctx.fastify.search.deleteContent({ variantId, workspaceId: ctx.auth.workspaceId });
    }),
  list: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}/list`, protect: true },
      permissions: { token: ["variants:read"] }
    })
    .input(z.void())
    .output(z.array(variant))
    .query(async ({ ctx }) => {
      const variantsCollection = getVariantsCollection(ctx.db);
      const variants = await variantsCollection
        .find({
          workspaceId: ctx.auth.workspaceId
        })
        .sort("_id", -1)
        .toArray();

      return variants.map(({ _id, label, key, description }) => {
        return {
          id: `${_id}`,
          label,
          key,
          description
        };
      });
    }),

  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return createEventSubscription<VariantsEvent>(ctx, `variants:${ctx.auth.workspaceId}`);
  })
});

export { variantsRouter };
export type { VariantsEvent };
