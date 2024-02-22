import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import blacklistDomains from "disposable-email-domains";
import blacklistWildcardDomains from "disposable-email-domains/wildcard";
import { getUsersCollection, FullUser } from "#collections";
import { errors } from "#lib/errors";
import { generateSalt, hashValue } from "#lib/hash";
import { UnderscoreID } from "#lib/mongo";
import { Context } from "#lib/context";

const emailDomainBlacklist = [
  ...blacklistDomains,
  ...blacklistWildcardDomains,
  "massefm.com",
  "cashbenties.com"
];
const emailDomainWhitelist: string[] = [];
const inputSchema = z.object({
  email: z.string().describe("Email address").email().max(320),
  username: z
    .string()
    .describe("Username")
    .regex(/^[a-z0-9_]*$/),
  password: z
    .string()
    .describe("Password")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .min(8)
    .max(128),
  redirect: z.string().describe("Redirect URL for after email verification").optional(),
  plan: z.string().describe("Identifier for the selected subscription plan").optional()
});
const handler = async (ctx: Context, input: z.infer<typeof inputSchema>): Promise<void> => {
  const users = getUsersCollection(ctx.db);
  const salt = await generateSalt();
  const hash = await hashValue(input.password, salt);
  const existingUser = await users.findOne({ email: input.email });

  if (existingUser) throw errors.alreadyExists("user");

  if (ctx.fastify.config.BLOCK_DISPOSABLE_EMAILS) {
    const whiteListedEmail = emailDomainWhitelist.some((domain) => input.email.endsWith(domain));
    const blackListedEmail = emailDomainBlacklist.some((domain) => input.email.endsWith(domain));

    if (blackListedEmail && !whiteListedEmail) throw errors.unauthorized("disposableEmail");
  }

  const emailVerificationCode = nanoid();
  const user: UnderscoreID<FullUser<ObjectId>> = {
    _id: new ObjectId(),
    username: input.username,
    email: input.email,
    emailVerificationCode: await hashValue(emailVerificationCode, salt),
    emailVerificationCodeExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    hash,
    salt
  };

  await users.insertOne(user);
  await ctx.fastify.redis.set(
    `user:${user._id}:emailVerificationRedirect`,
    input.redirect || "/",
    "EX",
    60 * 60 * 24
  );
  await ctx.fastify.redis.set(
    `user:${user._id}:subscriptionPlan`,
    input.plan || "/",
    "EX",
    60 * 60 * 24
  );
  await ctx.fastify.email.sendEmailVerification(user.email, {
    code: emailVerificationCode,
    username: user.username,
    userId: `${user._id}`
  });
};

export { inputSchema, handler };
