import clsx from "clsx";
import { Component, For, Show } from "solid-js";

import { useSettings } from "#web/context/settings";

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
                      const isActive = () => settings.activeTabID === item.id;

                      return (
                        <button
                          class={clsx(
                            ":base: group relative flex min-h-7 w-full flex-1 select-none items-center gap-1 overflow-hidden rounded-lg pl-0.5 text-left font-medium hover:cursor-pointer",
                            !isActive() &&
                              ":base: hover:bg-gradient-to-r hover:from-gray-500/10 hover:to-transparent"
                          )}
                          onClick={() => settings.setActiveTabID(item.id)}
                        >
                          <Show when={isActive()}>
                            <div class="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-secondary via-primary to-transparent opacity-10" />
                          </Show>
                          <div class="relative z-1 flex h-6 w-6 items-center justify-center">
                            <div
                              class={clsx(
                                "h-5 w-5 text-gray-400 dark:text-gray-500",
                                item.icon,
                                isActive() && "bg-gradient-to-tr"
                              )}
                            />
                          </div>
                          <span class="relative z-1 flex-1 line-clamp-1" title={item.label}>
                            {item.label}
                          </span>
                        </button>
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
