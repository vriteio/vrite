import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getTokensCollection, token } from "#collections";
import { errors } from "#lib/errors";
import { publishTokenEvent } from "#events";

const inputSchema = token.partial().required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const { id, ...update } = input;
  const { matchedCount } = await tokensCollection.updateOne(
    {
      _id: new ObjectId(id),
      workspaceId: ctx.auth.workspaceId
    },
    {
      $set: update
    }
  );

  if (matchedCount === 0) throw errors.notFound("token");

  publishTokenEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      id,
      ...update
    }
  });
};

export { inputSchema, handler };
