import {
  mdiWeatherNight,
  mdiWeatherSunny,
  mdiThemeLightDark,
  mdiCodeTags,
  mdiPaletteSwatch
} from "@mdi/js";
import clsx from "clsx";
import { Component, For } from "solid-js";
import { TitledCard } from "#components/fragments";
import { App, useAuthenticatedUserData, useClient } from "#context";
import { IconButton, Button } from "#components/primitives";

interface ThemePickerProps {
  theme: App.Theme;
  setTheme(theme: App.Theme): void;
}

const ThemePicker: Component<ThemePickerProps> = (props) => {
  const options = [
    { icon: mdiWeatherNight, label: "Dark", value: "dark" },
    { icon: mdiWeatherSunny, label: "Light", value: "light" },
    { icon: mdiThemeLightDark, label: "Auto", value: "auto" }
  ] as const;

  return (
    <div class="flex gap-4 w-full">
      <For each={options}>
        {(option) => {
          return (
            <IconButton
              path={option.icon}
              label={option.label}
              color={props.theme === option.value ? "primary" : "contrast"}
              text={props.theme === option.value ? "primary" : "soft"}
              class="m-0 flex-1 flex-col p-2"
              iconProps={{ class: "mb-1" }}
              onClick={() => props.setTheme(option.value)}
            />
          );
        }}
      </For>
    </div>
  );
};
const AppearanceSection: Component = () => {
  const client = useClient();
  const { userSettings } = useAuthenticatedUserData();
  const accentColors: App.AccentColor[] = ["energy", "neon", "sublime", "sunrise", "flow"];

  return (
    <div class="flex justify-center flex-col items-start w-full gap-5">
      <TitledCard icon={mdiThemeLightDark} label="Theme">
        <ThemePicker
          theme={userSettings()?.uiTheme || "auto"}
          setTheme={async (theme) => {
            await client.userSettings.update.mutate({ uiTheme: theme });
          }}
        />
      </TitledCard>
      <TitledCard label="Accent color" icon={mdiPaletteSwatch}>
        <div class="grid grid-cols-3 @lg:grid-cols-5 gap-4 w-full group/container">
          <For each={accentColors}>
            {(accentColor) => {
              const active = (): boolean => {
                const currentAccentColor = userSettings()?.accentColor || "energy";

                return currentAccentColor === accentColor;
              };

              return (
                <Button
                  class={clsx(
                    "w-full flex flex-col justify-center items-center m-0 p-2 theme group overflow-hidden relative hover:!text-white",
                    active() &&
                      "text-white group-hover/container:text-gray-700 dark:group-hover/container:text-gray-100"
                  )}
                  data-accent-color={accentColor}
                  onClick={async () => {
                    await client.userSettings.update.mutate({
                      accentColor: accentColor.toLowerCase() as App.AccentColor
                    });
                  }}
                  color="contrast"
                  text={active() ? "primary" : "soft"}
                >
                  <div
                    class={clsx(
                      "h-8 w-8 bg-gradient-to-tr transition-transform duration-350 ease-out rounded-full mb-1 from-secondary to-primary group-hover:(!scale-500)",
                      active() && "scale-500 group-hover/container:scale-100"
                    )}
                  />
                  <span class="z-1 capitalize">{accentColor}</span>
                </Button>
              );
            }}
          </For>
        </div>
      </TitledCard>
    </div>
  );
};

export { AppearanceSection };
