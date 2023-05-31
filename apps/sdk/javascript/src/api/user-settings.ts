import { SendRequest } from "./request";

type UIAccentColor = "energy" | "neon" | "sublime" | "sunrise" | "flow";
interface UserSettings {
  /**
   * UI Theme
   */
  uiTheme: "light" | "dark" | "auto";
  /**
   * Code editor theme
   */
  codeEditorTheme: "light" | "dark" | "auto";
  /**
   * UI accent color
   */
  accentColor: UIAccentColor;
}
interface UserSettingsEndpoints {
  get(): Promise<UserSettings>;
  update(input: Partial<UserSettings>): Promise<void>;
}

const basePath = "/user-settings";
const createUserSettingsEndpoints = (sendRequest: SendRequest): UserSettingsEndpoints => ({
  get: () => {
    return sendRequest<UserSettings>("GET", `${basePath}`);
  },
  update: (input) => {
    return sendRequest("PUT", `${basePath}`, {
      body: input
    });
  }
});

export { createUserSettingsEndpoints };
export type { UserSettings, UIAccentColor, UserSettingsEndpoints };
