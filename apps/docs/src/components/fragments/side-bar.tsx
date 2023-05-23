import { mdiLinkVariant, mdiMenu, mdiClose, mdiGithub, mdiLogin, mdiLightbulb } from "@mdi/js";
import clsx from "clsx";
import type { Component } from "solid-js";
import { menuOpened, setMenuOpened } from "#lib/state";
import { Card, Button, IconButton } from "#components/primitives";
import { logoIcon } from "#icons/logo";

interface SideBarProps {
  menu: Array<{ title: string; link: string }>;
  currentPath: string;
}

const apiDocsLink = "https://generator.swagger.io/?url=https://api.vrite.io/swagger.json";
const sdkLink = "https://github.com/vriteio/sdk-js";
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
      >
        <div class="flex items-center justify-start pb-4">
          <IconButton
            path={logoIcon}
            color="primary"
            link="/"
            class="bg-gradient-to-tr from-red-500 to-orange-500"
          />
          <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
        </div>
        <div class="flex flex-col w-full">
          <IconButton
            variant="text"
            class="justify-start w-full font-bold m-0"
            text="soft"
            label="Usage guide"
            path={mdiLightbulb}
            badge
          />
          <div class="flex flex-1 w-full pl-4 mt-2">
            <div class="w-0.5 bg-gray-200 dark:bg-gray-700 mr-2 rounded-full"></div>
            <div class="flex-1 flex flex-col gap-2">
              <For each={props.menu}>
                {(item) => {
                  return (
                    <Button
                      variant="text"
                      class="text-start w-full m-0"
                      text={item.link === props.currentPath ? "base" : "soft"}
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
        <IconButton
          variant="text"
          class="justify-start w-full font-bold m-0"
          text="soft"
          label="API Documentation"
          path={mdiLinkVariant}
          link={apiDocsLink}
          target="_blank"
        ></IconButton>
        <IconButton
          variant="text"
          class="justify-start w-full font-bold m-0"
          text="soft"
          label="JavaScript SDK"
          path={mdiLinkVariant}
          link={sdkLink}
          target="_blank"
        />

        <IconButton
          link="https://github.com/vriteio/vrite"
          class="w-full font-bold m-0 justify-start md:hidden"
          variant="text"
          path={mdiGithub}
          label="Star on GitHub"
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
        text="soft"
        class="fixed bottom-4 right-4 z-50 md:hidden"
        onClick={() => {
          setMenuOpened(!menuOpened());
        }}
      />
    </>
  );
};

export { SideBar };
