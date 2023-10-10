import { SearchPaletteProvider, useSearchPalette } from "./search-palette";
import { mdiAppleKeyboardCommand, mdiGithub, mdiMagnify } from "@mdi/js";
import { For, type Component, Show } from "solid-js";
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
  const { opened, setOpened } = useSearchPalette();

  return (
    <div
      class={clsx(
        "top-0 gap-2 h-12 fixed bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-b-2 right-0 z-1 items-center justify-center w-full flex py-2 px-4 md:px-8",
        "!pr-[max(1rem,calc((100%-(1536px))/2))]"
      )}
    >
      <div class="flex md:hidden items-center justify-start px-1">
        <IconButton
          path={logoIcon}
          color="primary"
          link="/"
          class="bg-gradient-to-tr from-red-500 to-orange-500 m-0 mr-1"
        />
        <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
      </div>
      <div class="flex-1" />
      <For each={externalLinks}>
        {(link) => {
          return (
            <a
              class="flex justify-start items-center group cursor-pointer"
              target="_blank"
              href={link.href}
            >
              <Tooltip text={link.label} class="mt-1">
                <IconButton
                  path={link.icon}
                  class="m-0 h-8 min-w-8"
                  iconProps={{ class: "h-5 w-5" }}
                  text="soft"
                />
              </Tooltip>
            </a>
          );
        }}
      </For>
      <IconButton
        path={mdiMagnify}
        label={
          <div class="hidden md:flex w-full items-center">
            <span class="pl-1 flex-1 text-start pr-3">Search</span>
            <Show when={typeof window === "object"}>
              <kbd class="bg-gray-300 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-800 flex justify-center items-center rounded-md px-1 h-5 text-sm">
                {isAppleDevice() ? (
                  <Icon path={mdiAppleKeyboardCommand} class="h-3 w-3" />
                ) : (
                  "Ctrl "
                )}
                K
              </kbd>
            </Show>
          </div>
        }
        text="soft"
        class="lg:min-w-48 justify-start m-0 group"
        onClick={() => {
          setOpened(!opened());
        }}
      />
      <Button color="primary" class="m-0" link="https://app.vrite.io">
        Sign in
      </Button>
    </div>
  );
};
const HeaderWrapper: Component = () => {
  return (
    <SearchPaletteProvider>
      <Header />
    </SearchPaletteProvider>
  );
};

export { HeaderWrapper as Header };
