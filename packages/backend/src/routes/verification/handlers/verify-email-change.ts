import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getUsersCollection } from "#collections";
import { publishUserEvent } from "#events";
import { errors } from "#lib/errors";
import { verifyValue } from "#lib/hash";

const inputSchema = z.object({
  code: z.string()
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const usersCollection = getUsersCollection(ctx.db);
  const user = await usersCollection.findOne({
    _id: new ObjectId(ctx.auth.userId)
  });

  if (!user) throw errors.notFound("user");

  let verifiedEmail: "new" | "old" | "none" = "none";
  let fullyVerified = false;

  const [newEmailChangeVerificationCode, oldEmailChangeVerificationCode, newEmail] =
    await ctx.fastify.redis.mget(
      `user:${user._id}:newEmailChangeVerificationCode`,
      `user:${user._id}:oldEmailChangeVerificationCode`,
      `user:${user._id}:newEmail`
    );

  if (
    newEmailChangeVerificationCode &&
    (await verifyValue(input.code, user.salt, newEmailChangeVerificationCode))
  ) {
    verifiedEmail = "new";
    fullyVerified = !oldEmailChangeVerificationCode;
    await ctx.fastify.redis.del(`user:${user._id}:newEmailChangeVerificationCode`);
  } else if (
    oldEmailChangeVerificationCode &&
    (await verifyValue(input.code, user.salt, oldEmailChangeVerificationCode))
  ) {
    verifiedEmail = "old";
    fullyVerified = !newEmailChangeVerificationCode;
    await ctx.fastify.redis.del(`user:${user._id}:oldEmailChangeVerificationCode`);
  } else {
    throw errors.invalid("verificationCode");
  }

  if (fullyVerified) {
    await ctx.fastify.redis.del(`user:${user._id}:newEmail`);
  }

  await usersCollection.updateOne(
    {
      _id: user._id
    },
    {
      $set: {
        ...(fullyVerified ? { email: newEmail || user.email } : {})
      }
    }
  );
  publishUserEvent(ctx, `${ctx.auth.userId}`, {
    action: "update",
    data: {
      id: `${user._id}`,
      ...(verifiedEmail === "new" ? { newEmailChangeInVerification: false } : {}),
      ...(verifiedEmail === "old" ? { oldEmailChangeInVerification: false } : {}),
      ...(fullyVerified ? { email: newEmail || user.email } : {})
    }
  });
};

export { inputSchema, handler };
