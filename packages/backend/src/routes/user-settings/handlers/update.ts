import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { appearanceSettings, getUserSettingsCollection } from "#collections";
import { publishUserSettingsEvent } from "#events";
import { errors } from "#lib/errors";

const inputSchema = appearanceSettings.omit({ codeEditorTheme: true }).partial();
const handler = async (
  ctx: AuthenticatedContext,
  input: z.infer<typeof inputSchema>
): Promise<void> => {
  const userSettingsCollection = getUserSettingsCollection(ctx.db);
  const { matchedCount } = await userSettingsCollection.updateOne(
    { userId: ctx.auth.userId },
    { $set: { ...input } }
  );

  if (!matchedCount) throw errors.notFound("userSettings");

  publishUserSettingsEvent(ctx, `${ctx.auth.userId}`, {
    action: "update",
    data: { ...input, ...(input.uiTheme ? { codeEditorTheme: input.uiTheme } : {}) }
  });
};

export { inputSchema, handler };
