import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getVariantsCollection, variant } from "#collections";

const outputSchema = z.array(variant);
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
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
};

export { outputSchema, handler };
