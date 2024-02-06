import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  getVariantsCollection,
  getContentPieceVariantsCollection,
  getContentVariantsCollection
} from "#collections";
import { publishVariantEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

declare module "fastify" {
  interface RouteCallbacks {
    "variants.delete": {
      ctx: AuthenticatedContext;
      data: {
        variantId: ObjectId;
      };
    };
  }
}

const inputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
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

  publishVariantEvent(ctx, `${ctx.auth.workspaceId}`, { action: "delete", data: input });
  ctx.fastify.routeCallbacks.run("variants.delete", ctx, { variantId });
};

export { inputSchema, handler };
