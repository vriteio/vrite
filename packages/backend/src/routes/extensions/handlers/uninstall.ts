import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getExtensionsCollection, getTokensCollection } from "#collections";
import { zodId } from "#lib/mongo";
import { publishExtensionEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const extensionsCollection = getExtensionsCollection(ctx.db);
  const tokensCollection = getTokensCollection(ctx.db);
  const { deletedCount } = await extensionsCollection.deleteOne({
    _id: new ObjectId(input.id)
  });

  if (!deletedCount) {
    throw errors.notFound("extension");
  }

  await tokensCollection.deleteOne({
    extensionId: new ObjectId(input.id)
  });
  publishExtensionEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: { id: input.id }
  });
};

export { inputSchema, handler };
