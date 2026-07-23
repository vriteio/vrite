import clsx from "clsx";
import { Component, For, Show } from "solid-js";

import { type SettingsMenuItem, useSettings } from "#web/context/settings";

interface SettingsMenuItemRowProps {
  item: SettingsMenuItem;
  nested?: boolean;
  activeBackground?: boolean;
}

const SettingsMenuItemRow: Component<SettingsMenuItemRowProps> = (props) => {
  const settings = useSettings();
  const isActive = () => settings.activeTabID === props.item.id;

  return (
    <button
      type="button"
      class={clsx(
        ":base: group relative flex min-h-7 w-full flex-1 select-none items-center gap-1 overflow-hidden rounded-r-lg pl-0.5 text-left font-medium focus:outline-none",
        !props.nested && ":base: rounded-l-lg",
        !isActive() && ":base: hover:bg-gradient-to-r hover:from-gray-500/10 hover:to-transparent"
      )}
      onClick={() => settings.setActiveTabID(props.item.id)}
    >
      <Show when={isActive() && (props.activeBackground ?? true)}>
        <div
          class={clsx(
            "pointer-events-none absolute inset-0 rounded-r-lg bg-gradient-to-r from-secondary via-primary to-transparent opacity-10",
            !props.nested && "rounded-l-lg"
          )}
        />
      </Show>
      <div class="relative flex h-6 w-6 items-center justify-center">
        <div
          class={clsx(
            "h-5 w-5 text-gray-400 dark:text-gray-500",
            props.item.icon,
            isActive() && "bg-gradient-to-tr"
          )}
        />
      </div>
      <span class="relative flex-1 line-clamp-1" title={props.item.label}>
        {props.item.label}
      </span>
    </button>
  );
};

const SettingsMenu: Component = () => {
  const settings = useSettings();

  return (
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1 scrollbar-sm">
      <h2 class="my-0.5 text-2xl font-semibold">Settings</h2>
      <div class="flex flex-col gap-3">
        <For each={settings.menu()}>
          {(subMenu) => {
            return (
              <div class="flex min-w-0 flex-col">
                <Show when={subMenu.label}>
                  <span class="ml-1 text-gray-400 dark:text-gray-500 text-xs leading-normal">
                    {subMenu.label}
                  </span>
                </Show>
                <div class="flex flex-col">
                  <For each={subMenu.items}>
                    {(item) => {
                      const activeChild = () => {
                        return item.subItems?.find((item) => item.id === settings.activeTabID);
                      };

                      return (
                        <>
                          <SettingsMenuItemRow item={item} />
                          <Show when={activeChild()}>
                            {(child) => (
                              <div class="relative flex">
                                <div class="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-secondary via-primary to-transparent opacity-10" />
                                <div class="relative flex min-w-3.5 items-center justify-end pl-0.5">
                                  <div class="h-full w-px rounded-full bg-gray-300 dark:bg-gray-600" />
                                </div>
                                <div class="relative flex flex-1 flex-col">
                                  <SettingsMenuItemRow
                                    item={child()}
                                    nested
                                    activeBackground={false}
                                  />
                                </div>
                              </div>
                            )}
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export { SettingsMenu };
