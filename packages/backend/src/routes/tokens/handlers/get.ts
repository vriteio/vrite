import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getTokensCollection, token } from "#collections";
import { errors } from "#lib/errors";

const inputSchema = token.pick({ id: true });
const outputSchema = token;
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const token = await tokensCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!token) throw errors.notFound("token");

  return {
    id: `${token._id}`,
    name: token.name || "",
    description: token.description || "",
    permissions: token.permissions
  };
};

export { inputSchema, outputSchema, handler };
