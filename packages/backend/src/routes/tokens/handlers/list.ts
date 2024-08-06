import { z } from "zod";
import { Filter, ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { FullToken, getTokensCollection, token } from "#collections";
import { UnderscoreID, zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().describe("Number of tokens to return per page").default(20),
    page: z.number().describe("Page number to fetch").default(1),
    lastId: zodId().describe("Last token ID to starting fetching tokens from").optional()
  })
  .default({});
const outputSchema = z.array(
  token.extend({
    extension: z.boolean().describe("Whether the token is associated with an extension").optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const tokensCollection = getTokensCollection(ctx.db);
  const filter: Filter<UnderscoreID<FullToken<ObjectId>>> = {
    workspaceId: ctx.auth.workspaceId
  };
  const cursor = tokensCollection
    .find({
      ...filter,
      ...(input.lastId ? { _id: { $lt: new ObjectId(input.lastId) } } : {})
    })
    .sort("_id", -1);

  if (!input.lastId && input.perPage) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  let tokens: Array<UnderscoreID<FullToken<ObjectId>>> = [];

  if (input.perPage) {
    tokens = await cursor.limit(input.perPage).toArray();
  } else {
    tokens = await cursor.toArray();
  }

  let totalCount = 0;

  if (input.perPage) {
    totalCount += (input.page - 1) * input.perPage + tokens.length;

    if (tokens.length === input.perPage) {
      totalCount += await tokensCollection.countDocuments(filter, { skip: totalCount });
    }
  } else {
    totalCount = tokens.length;
  }

  ctx.res.headers({
    "x-pagination-total": totalCount,
    "x-pagination-pages": Math.ceil(totalCount / (input.perPage || 1)),
    "x-pagination-per-page": input.perPage,
    "x-pagination-page": input.page
  });

  return tokens.map((token) => ({
    id: `${token._id}`,
    name: token.name || "",
    description: token.description || "",
    permissions: token.permissions,
    ...(token.extensionId && { extension: true })
  }));
};

export { inputSchema, outputSchema, handler };
