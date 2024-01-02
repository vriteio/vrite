import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { AuthenticatedContext } from "#lib/middleware";
import { getTokensCollection } from "#collections";
import { errors } from "#lib/errors";
import { hashValue } from "#lib/hash";

const inputSchema = z.object({ id: z.string() });
const outputSchema = z.object({ value: z.string() });
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

  const username = nanoid();
  const password = nanoid();

  await tokensCollection.updateOne(
    {
      _id: new ObjectId(input.id)
    },
    {
      $set: {
        userId: ctx.auth.userId,
        username,
        password: await hashValue(password, token.salt)
      }
    }
  );

  return {
    value: `${username}:${password}`
  };
};

export { inputSchema, outputSchema, handler };
