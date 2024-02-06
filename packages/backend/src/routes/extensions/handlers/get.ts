import { z } from "zod";
import { ObjectId } from "mongodb";
import { extension, getExtensionsCollection } from "#collections";
import { Context } from "#lib/context";

const outputSchema = extension.partial();
const handler = async (ctx: Context): Promise<z.infer<typeof outputSchema>> => {
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
};

export { outputSchema, handler };
