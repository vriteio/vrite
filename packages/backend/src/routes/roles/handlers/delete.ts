import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { getRolesCollection, getUsersCollection } from "#collections";
import { publishRoleEvent } from "#events";
import { errors } from "#lib/errors";
import { zodId } from "#lib/mongo";

const inputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const rolesCollection = getRolesCollection(ctx.db);
  const usersCollection = getUsersCollection(ctx.db);
  const role = await rolesCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!role) throw errors.notFound("role");
  if (role.baseType) throw errors.locked("role", { baseType: role.baseType });

  const viewerRole = await rolesCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    baseType: "viewer"
  });

  if (!viewerRole) throw errors.notFound("role");

  await rolesCollection.deleteOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });
  await usersCollection.updateMany(
    {
      workspaceId: ctx.auth.workspaceId,
      roleId: new ObjectId(input.id)
    },
    {
      $set: {
        roleId: viewerRole?._id
      }
    }
  );
  publishRoleEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "delete",
    data: {
      id: input.id,
      newRole: {
        permissions: viewerRole.permissions,
        name: viewerRole.name,
        description: viewerRole.description,
        id: `${viewerRole._id}`
      }
    }
  });
};

export { inputSchema, handler };
