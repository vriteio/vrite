import { z } from "zod";
import { AuthenticatedContext } from "#lib/middleware";
import { appearanceSettings, getUserSettingsCollection } from "#collections";
import { errors } from "#lib/errors";

const outputSchema = appearanceSettings;
const handler = async (ctx: AuthenticatedContext): Promise<z.infer<typeof outputSchema>> => {
  const userSettingsCollection = getUserSettingsCollection(ctx.db);
  const userSettings = await userSettingsCollection.findOne({
    userId: ctx.auth.userId
  });

  if (!userSettings) throw errors.notFound("userSettings");

  return {
    codeEditorTheme: userSettings.uiTheme,
    uiTheme: userSettings.uiTheme,
    accentColor: userSettings.accentColor
  };
};

export { outputSchema, handler };
