import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getTokensCollection, token } from "#collections";
import { publishTokenEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = token.pick({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const { deletedCount } = await tokensCollection.deleteOne({ _id: new ObjectId(input.id) });

  if (deletedCount === 0) throw errors.notFound("token");

  publishTokenEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: {
      id: input.id
    }
  });
};

export { inputSchema, handler };
