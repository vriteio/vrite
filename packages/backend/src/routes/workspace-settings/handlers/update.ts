import { z } from "zod";
import { ObjectId } from "mongodb";
import { AuthenticatedContext } from "#lib/middleware";
import {
  FullWorkspaceSettings,
  getWorkspaceSettingsCollection,
  workspaceSettings
} from "#collections";
import { publishWorkspaceSettingsEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = workspaceSettings
  .partial()
  .omit({ id: true, prettierConfig: true })
  .extend({ prettierConfig: z.string().optional() });
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const workspaceSettingsCollection = getWorkspaceSettingsCollection(ctx.db);
  const { prettierConfig, ...update } = input;
  const workspaceSettingsUpdate = update as Partial<FullWorkspaceSettings<ObjectId>>;

  if (prettierConfig) {
    try {
      JSON.parse(prettierConfig);
    } catch (error) {
      throw errors.invalid("prettierConfig");
    }

    workspaceSettingsUpdate.prettierConfig = input.prettierConfig;
  }

  const { matchedCount } = await workspaceSettingsCollection.updateOne(
    { workspaceId: ctx.auth.workspaceId },
    {
      $set: workspaceSettingsUpdate
    }
  );

  if (!matchedCount) throw errors.notFound("workspaceSettings");

  publishWorkspaceSettingsEvent(ctx, `${ctx.auth.workspaceId}`, {
    action: "update",
    data: input
  });
};

export { inputSchema, handler };
