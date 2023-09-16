import { mdiMenu, mdiClose, mdiGithub, mdiChevronDown, mdiCodeJson } from "@mdi/js";
import clsx from "clsx";
import { Component, For, JSX, createSignal } from "solid-js";
import { menuOpened, setMenuOpened } from "#lib/state";
import { Card, Button, IconButton } from "#components/primitives";
import { discordIcon } from "#assets/icons";
import { logoIcon } from "#assets/icons/logo";

interface SideBarProps {
  menu: Array<{
    label: string;
    menu: Array<{ label: string; link: string }>;
  }>;
  currentPath: string;
}

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
  },
  {
    label: "Vrite Cloud",
    icon: logoIcon,
    href: "https://app.vrite.io"
  },
  {
    label: "API Reference",
    icon: mdiCodeJson,
    href: "https://generator.swagger.io/?url=https://api.vrite.io/swagger.json#"
  }
];
const SideBarNestedMenu: Component<{
  menu: Array<{ label: string; link: string; menu?: Array<{ label: string; link: string }> }>;
  currentPath: string;
  children: JSX.Element;
}> = (props) => {
  const [opened, setOpened] = createSignal(
    props.menu.filter((item) => {
      return props.currentPath.includes(item.link);
    }).length > 0
  );

  return (
    <div class="flex flex-col w-full">
      <div class="flex justify-center items-center">
        {props.children}
        <IconButton
          path={mdiChevronDown}
          class="m-0"
          variant="text"
          iconProps={{
            class: clsx("transform transition-transform duration-100", opened() ? "" : "-rotate-90")
          }}
          onClick={() => setOpened((opened) => !opened)}
        />
      </div>
      <div
        class={clsx(
          "flex flex-1 w-full pl-3 overflow-hidden",
          opened() ? "max-h-full mt-2" : "max-h-0"
        )}
      >
        <div class="w-0.5 bg-gray-200 dark:bg-gray-700 mr-2 rounded-full"></div>
        <div class="flex-1 flex flex-col gap-2">
          <For each={props.menu}>
            {(item) => {
              if (item.menu) {
                return (
                  <SideBarNestedMenu currentPath={props.currentPath} menu={item.menu}>
                    <Button
                      variant="text"
                      class="justify-start w-full font-bold m-0"
                      badge
                      hover={false}
                    >
                      {item.label}
                    </Button>
                  </SideBarNestedMenu>
                );
              }

              const active = (): boolean => {
                return props.currentPath.includes(item.link);
              };

              return (
                <Button
                  variant={active() ? "solid" : "text"}
                  class="text-start w-full m-0"
                  text={active() ? "primary" : "soft"}
                  color={active() ? "primary" : "base"}
                  link={item.link}
                >
                  {item.label}
                </Button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
const SideBar: Component<SideBarProps> = (props) => {
  return (
    <>
      <div class={clsx("h-full fixed top-0 left-0 z-1", "pl-[max(0px,calc((100%-1536px)/2))]")}>
        <Card
          class={clsx(
            "top-0 h-full z-50 min-w-80 w-full md:max-w-80 m-0 bg-gray-100 dark:bg-gray-900",
            "flex-col gap-2 justify-start items-start border-0 md:border-r-2 rounded-none flex fixed md:relative",
            "transform md:transition-transform duration-300 ease-in-out scrollbar-sm-contrast overflow-auto",
            menuOpened() ? "" : "translate-y-full md:translate-y-0"
          )}
        >
          <div class="flex items-center justify-start px-1 pb-4 pt-2">
            <IconButton
              path={logoIcon}
              color="primary"
              link="/"
              class="bg-gradient-to-tr from-red-500 to-orange-500 m-0 mr-1"
            />
            <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">
              rite
            </span>
            <span class="text-gray-500 dark:text-gray-400 font-semibold border-l-2 pl-2 ml-2 leading-8 border-gray-200 dark:border-gray-700">
              Documentation
            </span>
          </div>
          <div class="flex flex-col gap-2 pl-1 w-full py-4">
            <For each={externalLinks}>
              {(link) => {
                return (
                  <a
                    class="flex justify-start items-center group w-full cursor-pointer"
                    target="_blank"
                    href={link.href}
                  >
                    <IconButton
                      path={link.icon}
                      class="m-0 group-hover:bg-gray-300 dark:group-hover:bg-gray-700 h-8 w-8"
                      iconProps={{ class: "h-5 w-5" }}
                      color="contrast"
                      text="soft"
                    />
                    <span class=" ml-2 text-gray-500 dark:text-gray-400">{link.label}</span>
                  </a>
                );
              }}
            </For>
          </div>
          <For each={props.menu}>
            {(menuItem) => {
              return (
                <SideBarNestedMenu currentPath={props.currentPath} menu={menuItem.menu}>
                  <Button
                    variant="text"
                    class="justify-start w-full font-bold m-0"
                    badge
                    hover={false}
                  >
                    {menuItem.label}
                  </Button>
                </SideBarNestedMenu>
              );
            }}
          </For>
        </Card>
        <div class="bg-gray-100 dark:bg-gray-900 absolute h-screen w-screen top-0 right-0" />
        <IconButton
          path={menuOpened() ? mdiClose : mdiMenu}
          size="large"
          color={menuOpened() ? "contrast" : "base"}
          text="soft"
          class="fixed bottom-4 right-4 z-50 md:hidden bg-gray-800 hover:bg-gray-700 text-gray-50 hover:text-gray-50 dark:bg-gray-200 dark:hover:bg-gray-300 dark:text-gray-900 dark:hover:text-gray-900"
          onClick={() => {
            setMenuOpened(!menuOpened());
          }}
        />
      </div>
      <div class="min-w-80 hidden md:block" />
    </>
  );
};

export { SideBar };
