import { z } from "zod";
import { ObjectId } from "mongodb";
import { getExtensionsCollection } from "#collections";
import { Context } from "#lib/context";

const inputSchema = z.object({
  data: z.object({}).passthrough()
});
const handler = async (ctx: Context, input: z.infer<typeof inputSchema>): Promise<void> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const extensionId = ctx.req.headers["x-vrite-extension-id"] as string | undefined;

  if (!extensionId) return;

  await extensionsCollection.updateOne(
    { _id: new ObjectId(extensionId) },
    {
      $set: {
        data: input
      }
    }
  );
};

export { inputSchema, handler };
