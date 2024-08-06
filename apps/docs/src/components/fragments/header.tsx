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
      class="top-0 md:px-8 h-16 bg-gray-50 dark:bg-gray-800 z-1 items-center justify-center flex w-full md:w-[calc(100%+4rem)] absolute left-1/2 -translate-x-1/2"
      id="header"
    >
      <SearchPalette />
    </div>
  );
};

export { Header };
