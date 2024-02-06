import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { contextObject, getExtensionsCollection } from "#collections";
import { publishExtensionEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({
  id: zodId(),
  config: contextObject
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
