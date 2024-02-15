import { z } from "zod";
import { ObjectId } from "mongodb";
import { getUsersCollection, getUserSettingsCollection } from "#collections";
import { errors } from "#lib/errors";
import { createSession } from "#lib/session";
import { createWorkspace } from "#lib/workspace";
import { Context } from "#lib/context";

const inputSchema = z.object({
  code: z.string().describe("Verification code"),
  userId: z.string().describe("ID of the user to verify the email for")
});
const outputSchema = z.object({
  redirect: z.string().describe("Redirect URL for after the email verification")
});
const handler = async (
  ctx: Context,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const users = getUsersCollection(ctx.db);
  const userSettingsCollection = getUserSettingsCollection(ctx.db);
  const user = await users.findOne({
    _id: new ObjectId(input.userId)
  });

  if (!user) throw errors.notFound("user");

  const redirect = await ctx.fastify.redis.get(`user:${user._id}:emailVerificationRedirect`);
  const plan = await ctx.fastify.redis.get(`user:${user._id}:subscriptionPlan`);

  await ctx.fastify.redis.del(`user:${user._id}:emailVerificationRedirect`);
  await ctx.fastify.redis.del(`user:${user._id}:subscriptionPlan`);
  await users.updateOne(
    {
      _id: user._id
    },
    {
      $unset: { emailVerificationCode: true, emailVerificationCodeExpiresAt: true }
    }
  );

  try {
    const workspaceId = await createWorkspace(user, ctx.fastify, {
      newUser: true,
      plan: plan || undefined
    });

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

  return { redirect: redirect || "/" };
};

export { inputSchema, outputSchema, handler };
