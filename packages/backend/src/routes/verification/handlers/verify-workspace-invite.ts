import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getWorkspaceMembershipsCollection, getUsersCollection } from "#collections";
import { publishWorkspaceMembershipEvent } from "#events";
import { errors } from "#lib/errors";
import { verifyValue } from "#lib/hash";

const inputSchema = z.object({ code: z.string(), membershipId: z.string() });
const outputSchema = z.object({ workspaceId: z.string() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
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

  return { workspaceId: `${workspaceMembership.workspaceId}` };
};

export { inputSchema, outputSchema, handler };
