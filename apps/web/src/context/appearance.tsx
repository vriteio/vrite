import { createPrefersDark } from "@solid-primitives/media";
import { Accessor, createContext, createEffect, ParentComponent, useContext } from "solid-js";
import { App, useAuthenticatedContext } from "#context";

type BaseTheme = "light" | "dark";

interface AppearanceContextData {
  uiTheme: Accessor<BaseTheme>;
  codeEditorTheme: Accessor<BaseTheme>;
  accentColor: Accessor<App.AccentColor>;
}

const AppearanceContext = createContext<AppearanceContextData>();
const AppearanceManager: ParentComponent = (props) => {
  const { userSettings } = useAuthenticatedContext();
  const prefersDark = createPrefersDark();
  const uiTheme = (): BaseTheme => {
    if (userSettings()?.uiTheme === "auto") {
      return prefersDark() ? "dark" : "light";
    }

    return userSettings()?.uiTheme === "dark" ? "dark" : "light";
  };
  const codeEditorTheme = (): BaseTheme => {
    if (userSettings()?.codeEditorTheme === "auto") {
      return prefersDark() ? "dark" : "light";
    }

    return userSettings()?.codeEditorTheme === "dark" ? "dark" : "light";
  };
  const accentColor = (): App.AccentColor => {
    return userSettings()?.accentColor || "energy";
  };

  createEffect(() => {
    if (uiTheme() === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });
  createEffect(() => {
    document.documentElement.dataset["accentColor"] = accentColor();
  });

  return (
    <AppearanceContext.Provider value={{ accentColor, uiTheme, codeEditorTheme }}>
      {props.children}
    </AppearanceContext.Provider>
  );
};
const useAppearanceContext = (): AppearanceContextData => {
  return useContext(AppearanceContext)!;
};

export { AppearanceManager, useAppearanceContext };
