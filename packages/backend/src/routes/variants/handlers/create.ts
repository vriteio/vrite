import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { variant, getVariantsCollection } from "#collections";
import { publishVariantEvent } from "#events";
import { zodId } from "#lib/mongo";

const inputSchema = variant.omit({ id: true });
const outputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const variantsCollection = getVariantsCollection(ctx.db);
  const variant = {
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    ...input
  };

  await variantsCollection.insertOne(variant);
  publishVariantEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: { ...input, id: `${variant._id}` }
  });

  return { id: `${variant._id}` };
};

export { inputSchema, outputSchema, handler };
