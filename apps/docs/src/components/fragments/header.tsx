import { setSearchPaletteOpened } from "./search-palette";
import { mdiAppleKeyboardCommand, mdiGithub, mdiMagnify } from "@mdi/js";
import { For, type Component, Show, createSignal, createEffect, onMount } from "solid-js";
import clsx from "clsx";
import { Button, Icon, IconButton, Tooltip } from "#components/primitives";
import { discordIcon, logoIcon } from "#assets/icons";

const isAppleDevice = (): boolean => {
  const platform = typeof navigator === "object" ? navigator.platform : "";
  const appleDeviceRegex = /Mac|iPod|iPhone|iPad/;

  return appleDeviceRegex.test(platform);
};
const externalLinks = [
  {
    label: "GitHub",
    icon: mdiGithub,
    href: "https://github.com/vriteio/vrite"
  },
  {
    label: "Discord",
    icon: discordIcon,
    href: "https://discord.gg/yYqDWyKnqE"
  }
];
const Header: Component = () => {
  const [showShortcut, setShowShortcut] = createSignal(false);

  onMount(() => {
    setShowShortcut(true);
  });

  return (
    <div
      class="top-0 md:px-8 h-16 bg-gray-50 dark:bg-gray-800 backdrop-blur-md z-1 items-center justify-center flex w-full md:w-[calc(100%+4rem)] absolute left-1/2 -translate-x-1/2 shadow-2xl shadow-gray-50 dark:shadow-gray-800"
      id="header"
    >
      <div
        class={clsx(
          "hidden lg:block pointer-events-none absolute z-1 to-transparent duration-150 transition-opacity",
          "h-4 w-full bg-gradient-to-b",
          "from-gray-50 dark:from-gray-800 top-16"
        )}
      />
      <IconButton
        path={mdiMagnify}
        label={
          <Show when={showShortcut()}>
            <div class="flex w-full items-center">
              <span class="pl-1 flex-1 text-start pr-3">Search</span>
              <kbd class="hidden border-0 bg-gray-300 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-800 md:flex justify-center items-center rounded-md px-1 h-5 text-sm">
                <Show when={isAppleDevice()} fallback={<span>Ctrl </span>}>
                  <Icon path={mdiAppleKeyboardCommand} class="h-3 w-3" />
                </Show>
                K
              </kbd>
            </div>
          </Show>
        }
        text="soft"
        class="w-full justify-start m-0 group max-w-screen-md rounded-xl bg-gray-100 dark:bg-gray-900 p-2"
        onClick={() => {
          // Force mobile keyboard to open (focus must be in user-triggered event handler)
          document.getElementById("search-palette-input")?.focus({ preventScroll: true });
          setSearchPaletteOpened((opened) => !opened);
        }}
      />
    </div>
  );
};

export { Header };
