import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getTokensCollection, token } from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().default(20),
    page: z.number().default(1),
    lastId: zodId().optional()
  })
  .default({});
const outputSchema = z.array(token.extend({ extension: z.boolean().optional() }));
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const cursor = tokensCollection
    .find({
      workspaceId: ctx.auth.workspaceId,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
    })
    .sort("_id", -1);

  if (!input.lastId) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  const tokens = await cursor.limit(input.perPage).toArray();

  return tokens.map((token) => ({
    id: `${token._id}`,
    name: token.name || "",
    description: token.description || "",
    permissions: token.permissions,
    ...(token.extensionId && { extension: true })
  }));
};

export { inputSchema, outputSchema, handler };
