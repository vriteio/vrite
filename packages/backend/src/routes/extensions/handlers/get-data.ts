import { z } from "zod";
import { ObjectId } from "mongodb";
import { getExtensionsCollection } from "#collections";
import { Context } from "#lib/context";

const outputSchema = z.object({}).passthrough();
const handler = async (ctx: Context): Promise<z.infer<typeof outputSchema>> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;

  if (!extensionId) return {};

  const extension = await extensionsCollection.findOne({
    _id: new ObjectId(extensionId)
  });

  return extension?.data || {};
};

export { outputSchema, handler };
