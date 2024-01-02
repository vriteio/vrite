import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import { role, getRolesCollection } from "#collections";
import { publishRoleEvent } from "#events";
import { zodId } from "#lib/mongo";

const inputSchema = role.omit({ id: true });
const outputSchema = z.object({ id: zodId() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const rolesCollection = getRolesCollection(ctx.db);
  const role = {
    _id: new ObjectId(),
    workspaceId: ctx.auth.workspaceId,
    name: input.name,
    description: input.description,
    permissions: input.permissions
  };

  await rolesCollection.insertOne(role);
  publishRoleEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "create",
    data: {
      ...input,
      id: `${role._id}`
    }
  });

  return { id: `${role._id}` };
};

export { inputSchema, outputSchema, handler };
