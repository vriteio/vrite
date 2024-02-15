import { z } from "zod";
import { ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import { AuthenticatedContext } from "#lib/middleware";
import {
  getWorkspaceMembershipsCollection,
  getRolesCollection,
  FullWorkspaceMembership
} from "#collections";
import { publishWorkspaceMembershipEvent } from "#events";
import { errors } from "#lib/errors";
import { generateSalt, hashValue } from "#lib/hash";
import { UnderscoreID, zodId } from "#lib/mongo";

declare module "fastify" {
  interface RouteCallbacks {
    "workspaceMemberships.sendInvite": {
      ctx: AuthenticatedContext;
      data: {
        workspaceMembership: UnderscoreID<FullWorkspaceMembership<ObjectId>>;
      };
    };
  }
}

const inputSchema = z.object({
  email: z.string().email().max(320).describe("Email to send invite to"),
  name: z.string().describe("Temporary name of the invited member"),
  roleId: zodId().describe("ID of the role to assign to the invited member")
});
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const rolesCollection = getRolesCollection(ctx.db);
  const currentRole = await rolesCollection.findOne({
    _id: new ObjectId(input.roleId),
    workspaceId: ctx.auth.workspaceId
  });

  if (!currentRole) throw errors.notFound("role");

  const inviteVerificationCodeSalt = await generateSalt();
  const inviteVerificationCode = nanoid();
  const workspaceMembership = {
    ...input,
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    roleId: new ObjectId(input.roleId),
    inviteVerificationCode: await hashValue(inviteVerificationCode, inviteVerificationCodeSalt),
    inviteVerificationCodeExpireAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    inviteVerificationCodeSalt
  };

  await workspaceMembershipsCollection.insertOne(workspaceMembership);
  await ctx.fastify.email.sendWorkspaceInvite(input.email, {
    code: inviteVerificationCode,
    workspaceId: `${ctx.auth.workspaceId}`,
    senderUserId: `${ctx.auth.userId}`,
    inviteeName: input.name,
    membershipId: `${workspaceMembership._id}`
  });
  publishWorkspaceMembershipEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: {
      ...input,
      id: `${workspaceMembership._id}`,
      pendingInvite: true
    }
  });
  ctx.fastify.routeCallbacks.run("workspaceMemberships.sendInvite", ctx, { workspaceMembership });
};

export { inputSchema, handler };
