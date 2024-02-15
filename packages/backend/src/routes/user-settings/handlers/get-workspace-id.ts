import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getWorkspacesCollection, getWorkspaceMembershipsCollection } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = z.object({
  workspaceId: z.string().describe("ID of the workspace the user is currently signed-into")
});
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const workspaceMembershipsCollection = getWorkspaceMembershipsCollection(ctx.db);
  const workspace = await workspacesCollection.findOne({
    _id: ctx.auth.workspaceId
  });

  if (!workspace) throw errors.notFound("workspace");

  const workspaceMembership = await workspaceMembershipsCollection.findOne({
    workspaceId: ctx.auth.workspaceId,
    userId: ctx.auth.userId
  });

  if (!workspaceMembership) throw errors.notFound("workspaceMembership");

  return { workspaceId: `${ctx.auth.workspaceId}` };
};

export { outputSchema, handler };
