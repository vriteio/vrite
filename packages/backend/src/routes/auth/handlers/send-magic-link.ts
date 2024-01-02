import { verifyTotp } from "../utils";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getUsersCollection } from "#collections";
import { errors } from "#lib/errors";
import { hashValue } from "#lib/hash";
import { Context } from "#lib/context";

const inputSchema = z.object({
  email: z.string().email().max(320),
  totpToken: z.string().optional(),
  redirect: z.string().optional()
});
const handler = async (ctx: Context, input: z.infer<typeof inputSchema>): Promise<void> => {
  const users = getUsersCollection(ctx.db);
  const user = await users.findOne({ email: input.email });

  if (!user) throw errors.notFound("user");

  if (user.emailVerificationCode) {
    throw errors.unauthorized("emailNotVerified");
  }

  const magicLinkSent = await ctx.fastify.redis.get(`user:${user._id}:magicLinkSent`);

  if (magicLinkSent === "true") {
    throw errors.unauthorized("magicLinkAlreadySent");
  }

  if (user.totpSecret) {
    verifyTotp(user, input.totpToken);
  }

  const magicLinkCode = nanoid();

  await ctx.fastify.redis.set(
    `user:${user._id}:magicLinkCode`,
    await hashValue(magicLinkCode, user.salt),
    "EX",
    60 * 30
  );
  await ctx.fastify.redis.set(
    `user:${user._id}:magicLinkRedirect`,
    input.redirect || "/",
    "EX",
    60 * 30
  );
  await ctx.fastify.redis.set(`user:${user._id}:magicLinkSent`, "true", "EX", 60);
  await ctx.fastify.email.sendMagicLink(user.email, {
    code: magicLinkCode,
    userId: `${user._id}`
  });
};

export { inputSchema, handler };
