import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { verificationDetails, getUsersCollection, profile } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = profile.merge(verificationDetails);
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const users = getUsersCollection(ctx.db);
  const user = await users.findOne({ _id: ctx.auth.userId });

  if (!user) throw errors.notFound("user");

  const [
    newEmailChangeVerificationCode,
    oldEmailChangeVerificationCode,
    passwordChangeVerificationCode
  ] = await ctx.fastify.redis.mget(
    `user:${user._id}:newEmailChangeVerificationCode`,
    `user:${user._id}:oldEmailChangeVerificationCode`,
    `user:${user._id}:passwordChangeVerificationCode`
  );

  return {
    id: `${user._id}`,
    fullName: user.fullName || "",
    bio: user.bio || "",
    avatar: user.avatar || "",
    username: user.username || "",
    email: user.email || "",
    newEmailChangeInVerification: Boolean(newEmailChangeVerificationCode),
    oldEmailChangeInVerification: Boolean(oldEmailChangeVerificationCode),
    passwordChangeInVerification: Boolean(passwordChangeVerificationCode),
    emailInVerification: Boolean(user.emailVerificationCode)
  };
};

export { outputSchema, handler };
