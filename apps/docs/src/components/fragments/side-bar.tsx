import {
  mdiLinkVariant,
  mdiMenu,
  mdiClose,
  mdiGithub,
  mdiLogin,
  mdiLightbulb,
  mdiTwitter,
  mdiLanguageJavascript,
  mdiServer,
  mdiApi,
  mdiTransitConnectionVariant,
  mdiSourcePull,
  mdiAlertCircle,
  mdiAlertCircleOutline,
  mdiLoginVariant
} from "@mdi/js";
import clsx from "clsx";
import { Component, For, JSX } from "solid-js";
import { menuOpened, setMenuOpened } from "#lib/state";
import { Card, Button, IconButton } from "#components/primitives";
import { discordIcon } from "#assets/icons";
import { logoIcon } from "#assets/icons/logo";

interface SideBarProps {
  usageGuideMenu: Array<{ title: string; link: string }>;
  apiDocsMenu: Array<{ title: string; link: string }>;
  currentPath: string;
}

const apiDocsLink = "/api";
const jsSDKLink = "/javascript-sdk";
const selfHostingLink = "/self-hosting";
const SideBarNestedMenu: Component<{
  menu: Array<{ title: string; link: string }>;
  currentPath: string;
  children: JSX.Element;
}> = (props) => {
  return (
    <div class="flex flex-col w-full">
      {props.children}
      <div class="flex flex-1 w-full pl-3 mt-2">
        <div class="w-0.5 bg-gray-200 dark:bg-gray-700 mr-2 rounded-full"></div>
        <div class="flex-1 flex flex-col gap-2">
          <For each={props.menu}>
            {(item) => {
              return (
                <Button
                  variant={item.link === props.currentPath ? "solid" : "text"}
                  class="text-start w-full m-0"
                  text={item.link === props.currentPath ? "primary" : "soft"}
                  color={item.link === props.currentPath ? "primary" : "base"}
                  link={item.link}
                >
                  {item.title}
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
      <Card
        class={clsx(
          "top-0 h-screen z-50 min-w-80 w-full md:max-w-80 m-0 max-h-screen scrollbar-sm overflow-auto",
          "flex-col gap-2 justify-start items-start border-0 md:border-r-2 rounded-none flex fixed md:sticky",
          "transform md:transition-transform duration-300 ease-in-out",
          menuOpened() ? "" : "translate-y-full md:translate-y-0"
        )}
        color="contrast"
      >
        <div class="flex items-center justify-start">
          <IconButton
            path={logoIcon}
            color="primary"
            link="/"
            class="bg-gradient-to-tr from-red-500 to-orange-500"
          />
          <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
          <span class="text-gray-500 dark:text-gray-400 font-semibold border-l-2 pl-2 ml-2 leading-8">
            Documentation
          </span>
        </div>
        <div class="flex flex-col gap-2 pl-1 w-full py-4">
          <div class="flex justify-start items-center group w-full cursor-pointer">
            <IconButton
              path={mdiGithub}
              class="m-0 group-hover:bg-gray-300 dark:group-hover:bg-gray-700 h-8 w-8"
              iconProps={{ class: "h-5 w-5" }}
              text="soft"
            />
            <span class=" ml-2 text-gray-500 dark:text-gray-400">GitHub</span>
          </div>
          <div class="flex justify-start items-center group w-full cursor-pointer">
            <IconButton
              path={discordIcon}
              class="m-0 group-hover:bg-gray-300 dark:group-hover:bg-gray-700 h-8 w-8"
              iconProps={{ class: "h-5 w-5" }}
              text="soft"
            />
            <span class=" ml-2 text-gray-500 dark:text-gray-400">Discord</span>
          </div>
          <div class="flex justify-start items-center group w-full cursor-pointer">
            <IconButton
              path={logoIcon}
              class="m-0 group-hover:bg-gray-300 dark:group-hover:bg-gray-700 h-8 w-8"
              iconProps={{ class: "h-5 w-5" }}
              text="soft"
            />
            <span class=" ml-2 text-gray-500 dark:text-gray-400">Vrite Cloud</span>
          </div>
        </div>
        <SideBarNestedMenu currentPath={props.currentPath} menu={props.usageGuideMenu}>
          <Button variant="text" class="justify-start w-full font-bold m-0" badge hover={false}>
            Usage Guide
          </Button>
        </SideBarNestedMenu>
        <SideBarNestedMenu currentPath={props.currentPath} menu={props.apiDocsMenu}>
          <Button variant="text" class="justify-start w-full font-bold m-0" badge hover={false}>
            API Documentation
          </Button>
        </SideBarNestedMenu>
        <Button
          variant="text"
          class="justify-start w-full font-semibold m-0"
          text={selfHostingLink === props.currentPath ? "base" : "soft"}
          color={selfHostingLink === props.currentPath ? "primary" : "base"}
          link={selfHostingLink}
        />
        <IconButton
          link="https://github.com/vriteio/vrite"
          class="w-full font-bold m-0 justify-start md:hidden"
          variant="text"
          label="Star on GitHub"
          text="soft"
        />
        <IconButton
          link="https://discord.gg/yYqDWyKnqE"
          class="w-full font-bold m-0 justify-start md:hidden"
          variant="text"
          path={discordIcon}
          label="Join Discord"
          text="soft"
        ></IconButton>
        <IconButton
          link="https://twitter.com/vriteio"
          class="w-full font-bold m-0 justify-start md:hidden"
          variant="text"
          path={mdiTwitter}
          label="Follow on Twitter"
          text="soft"
        ></IconButton>
        <IconButton
          color="primary"
          link="https://app.vrite.io"
          path={mdiLogin}
          variant="text"
          class="w-full m-0 justify-start fill-[url(#gradient)] md:hidden"
          label="Sign in"
        />
      </Card>
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
    </>
  );
};

export { SideBar };
