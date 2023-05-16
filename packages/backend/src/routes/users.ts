import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { hashValue } from "#lib/hash";
import { isAuthenticated } from "#lib/middleware";
import { UnderscoreID, zodId } from "#lib/mongo";
import { procedure, router } from "#lib/trpc";
import {
  FullUser,
  Profile,
  VerificationDetails,
  getUsersCollection,
  profile,
  verificationDetails
} from "#database/users";
import * as errors from "#lib/errors";
import { createEventPublisher, createEventSubscription } from "#lib/pub-sub";

type UserEvent = {
  action: "update";
  data: Partial<Profile> & { id: string } & Partial<VerificationDetails>;
};

const publishEvent = createEventPublisher<UserEvent>((userId: string) => `user:${userId}`);
const authenticatedProcedure = procedure.use(isAuthenticated);
const basePath = "/profile";
const usersRouter = router({
  changes: authenticatedProcedure.input(z.void()).subscription(async ({ ctx }) => {
    return createEventSubscription<UserEvent>(ctx, `user:${ctx.auth.userId}`);
  }),
  get: authenticatedProcedure
    .meta({
      openapi: { method: "GET", path: `${basePath}`, protect: true },
      permissions: { token: ["profile:read"] }
    })
    .input(z.void())
    .output(profile.merge(verificationDetails))
    .query(async ({ ctx }) => {
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
    }),
  update: authenticatedProcedure
    .input(profile.partial().omit({ id: true }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
      publishEvent(ctx, `${ctx.auth.userId}`, {
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
    })
});

export { usersRouter };
