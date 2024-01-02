import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { role, getRolesCollection } from "#collections";
import { publishRoleEvent } from "#events";
import { errors } from "#lib/errors";
import { updateSessionRole } from "#lib/session";

const inputSchema = role.partial().required({ id: true });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const rolesCollection = getRolesCollection(ctx.db);
  const role = await rolesCollection.findOne({
    _id: new ObjectId(input.id),
    workspaceId: ctx.auth.workspaceId
  });

  if (!role) throw errors.notFound("role");
  if (role.baseType) throw errors.locked("role", { baseType: role.baseType });

  await rolesCollection.updateOne(
    {
      _id: new ObjectId(input.id),
      workspaceId: ctx.auth.workspaceId
    },
    {
      $set: {
        name: input.name,
        description: input.description,
        permissions: input.permissions
      }
    }
  );
  updateSessionRole(ctx, input.id);
  publishRoleEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: {
      ...input
    }
  });
};

export { inputSchema, handler };
