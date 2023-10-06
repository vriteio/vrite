import { z } from "zod";
import { ObjectId } from "mongodb";
import {
  getUsersCollection,
  getUserSettingsCollection,
  getWorkspaceMembershipsCollection
} from "#database";
import {
  runWebhooks,
  verifyValue,
  isAuthenticatedUser,
  createSession,
  errors,
  createWorkspace,
  procedure,
  router
} from "#lib";
import { publishUserEvent, publishWorkspaceMembershipEvent } from "#events";

const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const verificationRouter = router({
  verifyMagicLink: procedure
    .input(
      z.object({
        code: z.string(),
        userId: z.string()
      })
    )
    .output(z.string())
    .mutation(async ({ ctx, input }) => {
      const users = getUsersCollection(ctx.db);
      const user = await users.findOne({
        _id: new ObjectId(input.userId)
      });

      if (!user) throw errors.notFound("user");

      const magicLinkCode = await ctx.fastify.redis.get(`user:${user._id}:magicLinkCode`);

      if (!magicLinkCode) throw errors.expired("verificationCode");

      if (!(await verifyValue(input.code, user.salt, magicLinkCode))) {
        throw errors.invalid("verificationCode");
      }

      const magicLinkRedirect = await ctx.fastify.redis.get(`user:${user._id}:magicLinkRedirect`);

      await ctx.fastify.redis.del(`user:${user._id}:magicLinkCode`);
      await ctx.fastify.redis.del(`user:${user._id}:magicLinkRedirect`);
      await createSession(ctx, `${user._id}`);

      return magicLinkRedirect || "/";
    }),
  verifyEmail: procedure
    .input(
      z.object({
        code: z.string(),
        userId: z.string()
      })
    )
    .output(z.string())
    .mutation(async ({ ctx, input }) => {
      const users = getUsersCollection(ctx.db);
      const userSettingsCollection = getUserSettingsCollection(ctx.db);
      const user = await users.findOne({
        _id: new ObjectId(input.userId)
      });

      if (!user) throw errors.notFound("user");

      const redirect = await ctx.fastify.redis.get(`user:${user._id}:emailVerificationRedirect`);

      await ctx.fastify.redis.del(`user:${user._id}:emailVerificationRedirect`);
      await users.updateOne(
        {
          _id: user._id
        },
        {
          $unset: { emailVerificationCode: true, emailVerificationCodeExpiresAt: true }
        }
      );

      try {
        const workspaceId = await createWorkspace(user, ctx.fastify, { defaultContent: true });

        await userSettingsCollection.insertOne({
          _id: new ObjectId(),
          userId: user._id,
          codeEditorTheme: "auto",
          uiTheme: "auto",
          accentColor: "energy",
          currentWorkspaceId: workspaceId
        });
        await createSession(ctx, `${user._id}`);
      } catch (error) {
        // eslint-disable-next-line no-console
        ctx.fastify.log.error(error);
      }

      return "/";
    }),
  verifyWorkspaceInvite: authenticatedUserProcedure
    .input(z.object({ code: z.string(), membershipId: z.string() }))
    .output(z.string())
    .mutation(async ({ ctx, input }) => {
      const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
      const usersCollection = getUsersCollection(ctx.db);
      const workspaceMembership = await workspaceMembershipsCollection.findOne({
        _id: new ObjectId(input.membershipId)
      });
      const user = await usersCollection.findOne({
        _id: new ObjectId(ctx.auth.userId)
      });

      if (!workspaceMembership) throw errors.notFound("workspaceMembership");
      if (!user) throw errors.notFound("user");

      if (
        !workspaceMembership.inviteVerificationCode ||
        !workspaceMembership.inviteVerificationCodeSalt ||
        !(await verifyValue(
          input.code,
          workspaceMembership.inviteVerificationCodeSalt,
          workspaceMembership.inviteVerificationCode
        ))
      ) {
        throw errors.invalid("verificationCode");
      }

      await workspaceMembershipsCollection.updateOne(
        {
          _id: workspaceMembership._id
        },
        {
          $set: {
            userId: new ObjectId(ctx.auth.userId)
          },
          $unset: {
            inviteVerificationCode: true,
            inviteVerificationCodeSalt: true,
            inviteVerificationCodeExpireAt: true,
            email: true,
            name: true
          }
        }
      );
      publishWorkspaceMembershipEvent(ctx, `${workspaceMembership.workspaceId}`, {
        action: "update",
        data: {
          id: `${workspaceMembership._id}`,
          userId: `${ctx.auth.userId}`,
          profile: {
            username: user.username,
            fullName: user.fullName,
            avatar: user.avatar
          },
          pendingInvite: false
        }
      });
      runWebhooks(ctx, "memberAdded", {
        ...workspaceMembership,
        id: `${workspaceMembership._id}`,
        userId: `${workspaceMembership.userId}`,
        roleId: `${workspaceMembership.roleId}`
      });

      return `${workspaceMembership.workspaceId}`;
    }),
  verifyPasswordChange: authenticatedUserProcedure
    .input(
      z.object({
        code: z.string()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
    }),
  verifyEmailChange: authenticatedUserProcedure
    .input(
      z.object({
        code: z.string()
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
    })
});

export { verificationRouter };
