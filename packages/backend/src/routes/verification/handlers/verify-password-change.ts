import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getUsersCollection } from "#collections";
import { publishUserEvent } from "#events";
import { errors } from "#lib/errors";
import { verifyValue } from "#lib/hash";

const inputSchema = z.object({
  code: z.string().describe("Verification code")
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

  const [passwordChangeVerificationCode, newHash] = await ctx.fastify.redis.mget(
    `user:${user._id}:passwordChangeVerificationCode`,
    `user:${user._id}:newHash`
  );

  if (
    !passwordChangeVerificationCode ||
    !(await verifyValue(input.code, user.salt, passwordChangeVerificationCode))
  ) {
    throw errors.invalid("verificationCode");
  }

  await ctx.fastify.redis
    .multi()
    .del(`user:${user._id}:passwordChangeVerificationCode`)
    .del(`user:${user._id}:newHash`)
    .exec();
  await usersCollection.updateOne(
    {
      _id: user._id
    },
    {
      $set: {
        hash: newHash || user.hash
      }
    }
  );
  publishUserEvent(ctx, `${ctx.auth.userId}`, {
    action: "update",
    data: {
      id: `${user._id}`,
      passwordChangeInVerification: false
    }
  });
};

export { inputSchema, handler };
