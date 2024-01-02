import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  workspace,
  getWorkspaceMembershipsCollection,
  getWorkspacesCollection,
  getRolesCollection
} from "#collections";
import { zodId } from "#lib/mongo";

const inputSchema = z
  .object({
    perPage: z.number().default(20),
    page: z.number().default(1),
    lastId: zodId().optional()
  })
  .default({});
const outputSchema = z.array(
  z.object({
    id: zodId(),
    workspace: workspace.omit({ contentGroups: true }),
    role: z.object({ name: z.string(), id: zodId() }).optional()
  })
);
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const rolesCollection = getRolesCollection(ctx.db);
  const cursor = workspaceMembershipsCollection
    .find({
      userId: ctx.auth.userId,
      ...(input.lastId && { _id: { $lt: new ObjectId(input.lastId) } })
    })
    .sort("_id", -1);

  if (!input.lastId) {
    cursor.skip((input.page - 1) * input.perPage);
  }

  const workspaceMemberships = await cursor.limit(input.perPage).toArray();
  const workspaces = await workspacesCollection
    .find({
      _id: {
        $in: workspaceMemberships.map(({ workspaceId }) => workspaceId)
      }
    })
    .toArray();
  const roles = await rolesCollection
    .find({
      _id: {
        $in: workspaceMemberships.map(({ roleId }) => roleId)
      }
    })
    .toArray();

  return workspaceMemberships.map(({ _id, workspaceId, roleId }) => {
    const workspace = workspaces.find(({ _id }) => {
      return _id.equals(workspaceId);
    });
    const role = roles.find(({ _id }) => {
      return _id.equals(roleId);
    });
    const roleData = {
      id: `${role?._id || ""}`,
      name: `${role?.name || ""}`
    };

    return {
      id: `${_id}`,
      workspace: {
        id: `${workspace?._id || ""}`,
        name: `${workspace?.name || ""}`,
        description: `${workspace?.description || ""}`,
        logo: `${workspace?.logo || ""}`
      },
      ...(role ? { role: roleData } : {})
    };
  });
};

export { inputSchema, outputSchema, handler };
