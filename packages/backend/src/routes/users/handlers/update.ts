import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { AuthenticatedContext } from "#lib/middleware";
import { FullUser, getUsersCollection, profile } from "#collections";
import { publishUserEvent } from "#events";
import { errors } from "#lib/errors";
import { hashValue } from "#lib/hash";
import { UnderscoreID } from "#lib/mongo";

const inputSchema = profile.partial().omit({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const usersCollection = getUsersCollection(ctx.db);
  const user = await usersCollection.findOne({ _id: ctx.auth.userId });

  if (!user) throw errors.notFound("user");

  const { email, ...updateData } = input;
  const update: Partial<UnderscoreID<FullUser<ObjectId>>> = {
    ...updateData
  };
  const updatedEmail = Boolean(input.email && input.email !== user.email);

  if (updatedEmail) {
    const newEmailChangeVerificationCode = nanoid();
    const oldEmailChangeVerificationCode = nanoid();

    await ctx.fastify.email.sendEmailChangeVerification(user.email, {
      code: oldEmailChangeVerificationCode
    });
    await ctx.fastify.email.sendEmailChangeVerification(input.email!, {
      code: newEmailChangeVerificationCode
    });
    ctx.fastify.redis
      .multi()
      .set(
        `user:${user._id}:newEmailChangeVerificationCode`,
        await hashValue(newEmailChangeVerificationCode, user.salt),
        "EX",
        60 * 30
      )
      .set(
        `user:${user._id}:oldEmailChangeVerificationCode`,
        await hashValue(oldEmailChangeVerificationCode, user.salt),
        "EX",
        60 * 30
      )
      .set(`user:${user._id}:newEmail`, input.email!, "EX", 60 * 30)
      .exec();
  }

  const passwordChangeVerificationCode = await ctx.fastify.redis.get(
    `user:${user._id}:passwordChangeVerificationCode`
  );

  await usersCollection.updateOne(
    { _id: ctx.auth.userId },
    {
      $set: update
    }
  );
  publishUserEvent(ctx, `${ctx.auth.userId}`, {
    action: "update",
    data: {
      id: `${user._id}`,
      ...input,
      newEmailChangeInVerification: updatedEmail,
      oldEmailChangeInVerification: updatedEmail,
      passwordChangeInVerification: Boolean(passwordChangeVerificationCode),
      emailInVerification: Boolean(user.emailVerificationCode)
    }
  });
};

export { inputSchema, handler };
