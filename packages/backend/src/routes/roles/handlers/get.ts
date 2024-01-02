import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  role,
  baseRoleType,
  getRolesCollection,
  getWorkspaceMembershipsCollection
} from "#collections";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({ id: zodId().optional() }).default({});
const outputSchema = role.extend({ id: zodId(), baseType: baseRoleType.optional() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const rolesCollection = getRolesCollection(ctx.db);
  const membershipsCollection = getWorkspaceMembershipsCollection(ctx.db);

  let roleId = input.id ? new ObjectId(input.id) : undefined;

  if (!roleId) {
    const membership = await membershipsCollection.findOne({
      workspaceId: ctx.auth.workspaceId,
      userId: ctx.auth.userId
    });

    if (!membership) {
      throw errors.notFound("role");
    }

    roleId = membership.roleId || roleId;
  }

  const role = await rolesCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    _id: roleId
  });

  if (!role) {
    throw errors.notFound("role");
  }

  return {
    id: `${role._id}`,
    ...role
  };
};

export { inputSchema, outputSchema, handler };
