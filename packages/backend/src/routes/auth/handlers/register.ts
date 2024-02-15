import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { getUsersCollection, FullUser } from "#collections";
import { errors } from "#lib/errors";
import { generateSalt, hashValue } from "#lib/hash";
import { UnderscoreID } from "#lib/mongo";
import { Context } from "#lib/context";

const inputSchema = z.object({
  email: z.string().email().max(320).describe("Email address"),
  username: z
    .string()
    .regex(/^[a-z0-9_]*$/)
    .describe("Username"),
  password: z
    .string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    .min(8)
    .max(128)
    .describe("Password"),
  redirect: z.string().optional().describe("Redirect URL for after email verification"),
  plan: z.string().optional().describe("Identifier for the selected subscription plan")
});
const handler = async (ctx: Context, input: z.infer<typeof inputSchema>): Promise<void> => {
  const users = getUsersCollection(ctx.db);
  const salt = await generateSalt();
  const hash = await hashValue(input.password, salt);
  const existingUser = await users.findOne({ email: input.email });

  if (existingUser) throw errors.alreadyExists("user");

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
