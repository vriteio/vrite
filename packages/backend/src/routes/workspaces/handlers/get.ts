import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { workspace, getWorkspacesCollection } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = workspace.pick({
  id: true,
  name: true,
  logo: true,
  description: true
});
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const workspacesCollection = getWorkspacesCollection(ctx.db);
  const workspace = await workspacesCollection.findOne({
    _id: ctx.auth.workspaceId
  });

  if (!workspace) throw errors.notFound("workspace");

  return {
    id: `${workspace._id}`,
    name: workspace.name,
    logo: workspace.logo,
    description: workspace.description
  };
};

export { outputSchema, handler };
