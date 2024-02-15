import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { extension, getExtensionsCollection } from "#collections";
import { publishExtensionEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = extension.pick({
  id: true,
  config: true
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const { matchedCount } = await extensionsCollection.updateOne(
    { _id: new ObjectId(input.id) },
    {
      $set: {
        config: input.config
      }
    }
  );

  if (!matchedCount) {
    throw errors.notFound("extension");
  }

  publishExtensionEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      id: input.id,
      config: input.config
    }
  });
};

export { inputSchema, handler };
