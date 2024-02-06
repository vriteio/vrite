import { Collection, Db, ObjectId } from "mongodb";
import { z } from "zod";
import { UnderscoreID, zodId } from "#lib/mongo";

const theme = z.enum(["light", "dark", "auto"]);
const accentColor = z.enum(["energy", "neon", "sublime", "sunrise", "flow"]);
const appearanceSettings = z.object({
  uiTheme: theme,
  codeEditorTheme: theme,
  accentColor
});
const userSettings = appearanceSettings.extend({
  id: zodId(),
  currentWorkspaceId: z.string()
});

type Theme = z.infer<typeof theme>;
type AccentColor = z.infer<typeof accentColor>;
interface AppearanceSettings extends z.infer<typeof appearanceSettings> {}
interface UserSettings<ID extends string | ObjectId = string>
  extends Omit<z.infer<typeof userSettings>, "currentWorkspaceId" | "id"> {
  id: ID;
  currentWorkspaceId: ID;
}
interface FullUserSettings<ID extends string | ObjectId = string> extends UserSettings<ID> {
  userId: ID;
}

const getUserSettingsCollection = (
  db: Db
): Collection<UnderscoreID<FullUserSettings<ObjectId>>> => {
  return db.collection("user-settings");
};

export { theme, accentColor, appearanceSettings, userSettings, getUserSettingsCollection };
export type { AppearanceSettings, UserSettings, FullUserSettings, Theme, AccentColor };
