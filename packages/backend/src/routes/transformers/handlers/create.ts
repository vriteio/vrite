import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getTransformersCollection, transformer } from "#collections";
import { publishTransformerEvent } from "#events";

const inputSchema = transformer.omit({ id: true });
const outputSchema = transformer.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
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
};

export { inputSchema, outputSchema, handler };
