import { z } from "zod";
import { nanoid } from "nanoid";
import { AuthenticatedContext } from "#lib/middleware";
import { getUsersCollection } from "#collections";
import { errors } from "#lib/errors";
import { verifyValue, hashValue } from "#lib/hash";

const inputSchema = z.object({ newPassword: z.string(), oldPassword: z.string() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const usersCollection = getUsersCollection(ctx.db);
  const user = await usersCollection.findOne({
    _id: ctx.auth.userId
  });

  if (!user) throw errors.notFound("user");

  if (!(await verifyValue(input.oldPassword, user.salt, user.hash || ""))) {
    throw errors.invalid("password");
  }

  const passwordChangeVerificationCode = nanoid();

  await ctx.fastify.redis
    .multi()
    .set(
      `user:${user._id}:passwordChangeVerificationCode`,
      await hashValue(passwordChangeVerificationCode, user.salt),
      "EX",
      60 * 30
    )
    .set(`user:${user._id}:newHash`, await hashValue(input.newPassword, user.salt), "EX", 60 * 30)
    .exec();
  await ctx.fastify.email.sendPasswordChangeVerification(user.email, {
    code: passwordChangeVerificationCode
  });
};

export { inputSchema, handler };
