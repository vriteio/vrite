import {
  Input,
  IconButton,
  Button,
  Dropdown,
  OptionsList,
  Select
} from "#web/components/primitives";
import { Component, createSignal, For, Show } from "solid-js";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import clsx from "clsx";

interface AppearanceSettingsTabProps {
  setTab(tabId: string): void;
}

const AppearanceSettingsTab: Component<AppearanceSettingsTabProps> = (props) => {
  const [accentColor, setAccentColor] = createSignal("");

  return (
    <div class="flex flex-col gap-3">
      <SettingsSection label="UI Theme">
        <Setting label="Theme" description="Select a theme for the user interface.">
          <div class="flex gap-3 w-64">
            <For
              each={[
                { icon: "i-lucide:sun", label: "Light", active: true },
                { icon: "i-lucide:moon", label: "Dark" },
                { icon: "i-lucide:sun-moon", label: "System" }
              ]}
            >
              {(option) => {
                return (
                  <Button
                    class="items-center justify-center flex flex-col flex-1"
                    text={option.active ? undefined : "soft"}
                    size="small"
                    color={option.active ? "primary" : "contrast"}
                    variant={option.active ? "solid" : "outlined"}
                  >
                    <div class={clsx("h-5 w-5", option.icon)} />
                    {option.label}
                  </Button>
                );
              }}
            </For>
          </div>
        </Setting>
        <Setting
          label="Accent color"
          description="Accent color is used for primary buttons, links, and other elements"
        >
          <Select
            options={[
              {
                class: "from-secondary via-primary to-secondary",
                value: "andesine",
                label: "Andesine"
              },
              {
                class: "from-orange-500 via-red-500 to-orange-500",
                label: "Energy",
                value: "energy"
              },
              {
                class: "from-lime-400 via-cyan-400 to-lime-400",
                label: "Neon",
                value: "neon"
              },
              {
                class: "from-indigo-500 via-fuchsia-400 to-indigo-500",
                label: "Sublime",
                value: "sublime"
              },
              {
                class: "from-orange-300 via-rose-400 to-orange-300",
                label: "Sunrise",
                value: "sunrise"
              },
              {
                class: "from-blue-400 via-cyan-400 to-blue-400",
                label: "Flow",
                value: "flow"
              }
            ]}
            class="w-48"
            placeholder="Accent color"
            value={accentColor()}
            setValue={(value) => {
              setAccentColor(value);
            }}
          >
            {(option) => {
              return (
                <>
                  <div
                    class={clsx(
                      "bg-gradient-to-tr bg-[length:125%_auto] h-5 w-5 rounded-md transition-all ease-out duration-200",
                      option.selected && "bg-right",
                      option.class
                    )}
                  />
                  <span class="flex-1 text-start mx-1">{option.label}</span>
                </>
              );
            }}
          </Select>
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { AppearanceSettingsTab };
