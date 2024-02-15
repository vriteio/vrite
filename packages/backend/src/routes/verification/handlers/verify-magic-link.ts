import { z } from "zod";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "#collections";
import { errors } from "#lib/errors";
import { verifyValue } from "#lib/hash";
import { createSession } from "#lib/session";
import { Context } from "#lib/context";

const inputSchema = z.object({
  code: z.string().describe("Verification code"),
  userId: z.string().describe("ID of the user to verify the magic link for")
});
const outputSchema = z.object({
  redirect: z.string().describe("Redirect URL for after the magic link verification")
});
const handler = async (
  ctx: Context,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const users = getUsersCollection(ctx.db);
  const user = await users.findOne({
    _id: new ObjectId(input.userId)
  });

  if (!user) throw errors.notFound("user");

  const magicLinkCode = await ctx.fastify.redis.get(`user:${user._id}:magicLinkCode`);

  if (!magicLinkCode) throw errors.expired("verificationCode");

  if (!(await verifyValue(input.code, user.salt, magicLinkCode))) {
    throw errors.invalid("verificationCode");
  }

  const magicLinkRedirect = await ctx.fastify.redis.get(`user:${user._id}:magicLinkRedirect`);

  await ctx.fastify.redis.del(`user:${user._id}:magicLinkCode`);
  await ctx.fastify.redis.del(`user:${user._id}:magicLinkRedirect`);
  await createSession(ctx, `${user._id}`);

  return {
    redirect: magicLinkRedirect || "/"
  };
};

export { inputSchema, outputSchema, handler };
