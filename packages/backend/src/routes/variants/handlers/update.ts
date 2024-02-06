import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { variant, getVariantsCollection } from "#collections";
import { publishVariantEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = variant.partial().required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const variantsCollection = getVariantsCollection(ctx.db);
  const { id, ...update } = input;
  const { matchedCount } = await variantsCollection.updateOne(
    { _id: new ObjectId(id), workspaceId: ctx.auth.workspaceId },
    { $set: update }
  );

  if (!matchedCount) throw errors.notFound("variant");

  publishVariantEvent(ctx, `${ctx.auth.workspaceId}`, { action: "update", data: input });
};

export { inputSchema, handler };
