import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  getWorkspaceMembershipsCollection,
  getRolesCollection,
  workspaceMembership
} from "#collections";
import { publishWorkspaceMembershipEvent } from "#events";
import { errors } from "#lib/errors";
import { updateSessionUser } from "#lib/session";

const inputSchema = workspaceMembership.pick({ id: true, roleId: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const rolesCollection = getRolesCollection(ctx.db);
  const membership = await workspaceMembershipsCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!membership) throw errors.notFound("workspaceMembership");

  const role = await rolesCollection.findOne({
    _id: new ObjectId(input.roleId)
  });

  if (!role) throw errors.notFound("role");

  const currentRole = await rolesCollection.findOne({
    _id: membership.roleId,
    workspaceId: ctx.auth.workspaceId
  });

  if (currentRole?.baseType === "admin") {
    const remainingAdmins = await workspaceMembershipsCollection.countDocuments({
      workspaceId: ctx.auth.workspaceId,
      roleId: currentRole._id,
      userId: { $exists: true }
    });

    if (remainingAdmins === 1) throw errors.badRequest("notAllowed");
  }

  await workspaceMembershipsCollection.updateOne(
    {
      _id: new ObjectId(input.id),
      workspaceId: ctx.auth.workspaceId
    },
    {
      $set: {
        roleId: new ObjectId(input.roleId)
      }
    }
  );
  await updateSessionUser(ctx, `${membership.userId}`);
  publishWorkspaceMembershipEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      id: input.id,
      userId: `${membership.userId}`,
      roleId: `${role._id}`,
      role: {
        id: `${role._id}`,
        name: role.name,
        permissions: role.permissions,
        description: role.description
      }
    }
  });
};

export { inputSchema, handler };
