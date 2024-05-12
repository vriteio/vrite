import { verifyTotp } from "../utils";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getUsersCollection } from "#collections";
import { errors } from "#lib/errors";
import { hashValue } from "#lib/hash";
import { Context } from "#lib/context";

const inputSchema = z.object({
  email: z.string().describe("Email address").email().max(320),
  totpToken: z.string().describe("TOTP token (if 2FA is enabled)").optional(),
  redirect: z.string().describe("Redirect URL for after magic link verification").optional()
});
const handler = async (ctx: Context, input: z.infer<typeof inputSchema>): Promise<void> => {
  const users = getUsersCollection(ctx.db);
  const user = await users.findOne({ email: input.email });
  const isValidRedirect =
    input.redirect?.startsWith("/") ||
    input.redirect?.startsWith(ctx.fastify.config.PUBLIC_APP_URL);
  const redirect = isValidRedirect ? input.redirect || "/" : "/";

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
  await ctx.fastify.redis.set(`user:${user._id}:magicLinkRedirect`, redirect, "EX", 60 * 30);
  await ctx.fastify.redis.set(`user:${user._id}:magicLinkSent`, "true", "EX", 60);
  await ctx.fastify.email.sendMagicLink(user.email, {
    code: magicLinkCode,
    userId: `${user._id}`
  });
};

export { inputSchema, handler };
