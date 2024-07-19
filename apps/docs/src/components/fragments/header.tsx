import { SearchPalette } from "./search-palette";
import { mdiGithub } from "@mdi/js";
import { type Component } from "solid-js";
import clsx from "clsx";
import { discordIcon } from "#assets/icons";

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
  return (
    <div
      class="top-0 md:px-8 h-16 bg-gray-50 dark:bg-gray-800 backdrop-blur-md z-1 items-center justify-center flex w-full md:w-[calc(100%+4rem)] absolute left-1/2 -translate-x-1/2 shadow-2xl shadow-gray-50 dark:shadow-gray-800"
      id="header"
    >
      <div class="top-0 absolute max-w-full bg-gray-50 dark:bg-gray-800 h-full w-screen xl:max-w-screen" />
      <div
        class={clsx(
          "hidden lg:block pointer-events-none absolute z-1 to-transparent duration-150 transition-opacity w-screen",
          "h-4 bg-gradient-to-b",
          "from-gray-50 dark:from-gray-800 top-16"
        )}
      />
      <SearchPalette />
    </div>
  );
};

export { Header };
