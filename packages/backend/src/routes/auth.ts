import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { z } from "zod";
import * as OTPAuth from "otpauth";
import { FullUser, getUsersCollection } from "#database/users";
import { UnderscoreID } from "#lib/mongo";
import { generateSalt, hashValue, verifyValue } from "#lib/hash";
import { procedure, router } from "#lib/trpc";
import {
  createSession,
  deleteSession,
  getSessionId,
  refreshSession,
  updateSession
} from "#lib/session";
import { processAuth } from "#lib/auth";
import * as errors from "#lib/errors";
import { isAuthenticated, isAuthenticatedUser } from "#lib/middleware";
import { getUserSettingsCollection } from "#database";

const totpConfig = {
  issuer: "Vrite",
  algorithm: "SHA512",
  digits: 6,
  period: 30
};
const verifyTotp = (user: UnderscoreID<FullUser<ObjectId>>, totpToken?: string): void => {
  if (!totpToken) throw errors.unauthorized("totpTokenRequired");

  const totp = new OTPAuth.TOTP({
    ...totpConfig,
    label: user.username,
    secret: user.totpSecret
  });
  const result = totp.validate({ token: totpToken, window: 1 });

  if (typeof result !== "number") {
    throw errors.unauthorized("totpTokenInvalid");
  }
};
const authenticatedProcedure = procedure.use(isAuthenticated);
const authenticatedUserProcedure = procedure.use(isAuthenticatedUser);
const authRouter = router({
  isSignedIn: procedure
    .input(z.void())
    .output(z.boolean())
    .query(async ({ ctx }) => {
      const auth = await processAuth(ctx);

      return Boolean(auth);
    }),
  register: procedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().regex(/^[a-z0-9_]*$/),
        password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/),
        redirect: z.string().optional()
      })
    )
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
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
      await ctx.fastify.email.sendEmailVerification(user.email, {
        code: emailVerificationCode,
        username: user.username,
        userId: `${user._id}`
      });
    }),
  sendMagicLink: procedure
    .input(
      z.object({
        email: z.string().email(),
        totpToken: z.string().optional(),
        redirect: z.string().optional()
      })
    )
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      const users = getUsersCollection(ctx.db);
      const user = await users.findOne({ email: input.email });

      if (!user) throw errors.notFound("user");

      if (user.emailVerificationCode) {
        throw errors.unauthorized("emailNotVerified");
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
      await ctx.fastify.redis.set(
        `user:${user._id}:magicLinkRedirect`,
        input.redirect || "/",
        "EX",
        60 * 30
      );
      await ctx.fastify.email.sendMagicLink(user.email, {
        code: magicLinkCode,
        userId: `${user._id}`
      });
    }),
  login: procedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
        totpToken: z.string().optional()
      })
    )
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      const users = getUsersCollection(ctx.db);
      const user = await users.findOne({ email: input.email });

      if (!user || !user.hash) {
        throw errors.notFound("user");
      }

      const correctPassword = await verifyValue(input.password, user.salt, user.hash);

      if (!correctPassword) {
        throw errors.unauthorized("passwordInvalid");
      }

      if (user.emailVerificationCode) {
        throw errors.unauthorized("emailNotVerified");
      }

      if (user.totpSecret) {
        verifyTotp(user, input.totpToken);
      }

      await createSession(ctx, `${user._id}`);
    }),
  logout: procedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      const sessionId = await getSessionId(ctx, "refreshToken");

      if (sessionId) {
        deleteSession(ctx, sessionId);
      }
    }),
  refreshToken: procedure
    .input(z.void())
    .output(z.void())
    .mutation(async ({ ctx }) => {
      let sessionId = await getSessionId(ctx, "accessToken");

      if (sessionId) {
        return;
      }

      sessionId = await getSessionId(ctx, "refreshToken");

      if (!sessionId) {
        throw errors.unauthorized("invalidRefreshToken");
      }

      await refreshSession(ctx, sessionId);
    }),
  initTwoFactor: authenticatedProcedure
    .input(z.void())
    .output(z.string())
    .mutation(async ({ ctx }) => {
      const usersCollection = getUsersCollection(ctx.db);
      const user = await usersCollection.findOne({
        _id: ctx.auth.userId
      });

      if (!user) throw errors.notFound("user");

      const totpSecret = nanoid();

      await usersCollection.updateOne({ _id: user._id }, { $set: { totpSecret } });

      const totp = new OTPAuth.TOTP({
        ...totpConfig,
        label: user.username,
        secret: totpSecret
      });

      return totp.toString();
    }),
  changePassword: authenticatedProcedure
    .input(z.object({ newPassword: z.string(), oldPassword: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
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
        .set(
          `user:${user._id}:newHash`,
          await hashValue(input.newPassword, user.salt),
          "EX",
          60 * 30
        )
        .exec();
      await ctx.fastify.email.sendPasswordChangeVerification(user.email, {
        code: passwordChangeVerificationCode
      });
    }),
  switchWorkspace: authenticatedUserProcedure
    .input(z.string())
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const userSettingsCollection = getUserSettingsCollection(ctx.db);
      const sessionId = await getSessionId(ctx, "accessToken");
      const { matchedCount } = await userSettingsCollection.updateOne(
        { userId: ctx.auth.userId },
        { $set: { currentWorkspaceId: new ObjectId(input) } }
      );

      if (!matchedCount) throw errors.notFound("userSettings");

      if (sessionId) {
        await updateSession(ctx, sessionId, `${ctx.auth.userId}`);
      }
    })
});

export { authRouter };
