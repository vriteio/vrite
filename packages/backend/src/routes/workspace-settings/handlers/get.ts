import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { getWorkspaceSettingsCollection, workspaceSettings } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = workspaceSettings;
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
  const workspaceSettings = await workspaceSettingsCollection.findOne({
    workspaceId: ctx.auth.workspaceId
  });

  if (!workspaceSettings) {
    throw errors.notFound("workspaceSettings");
  }

  return {
    id: `${workspaceSettings._id}`,
    prettierConfig: workspaceSettings.prettierConfig,
    metadata: workspaceSettings.metadata,
    marks: workspaceSettings.marks,
    blocks: workspaceSettings.blocks,
    embeds: workspaceSettings.embeds,
    dashboardViews: workspaceSettings.dashboardViews
  };
};

export { outputSchema, handler };
