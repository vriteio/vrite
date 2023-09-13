import { mdiApi, mdiBookOpenBlankVariant, mdiClose, mdiGithub } from "@mdi/js";
import { Component, For } from "solid-js";
import { Button, Card, Heading, Icon, IconButton } from "#components/primitives";
import { discordIcon } from "#assets/icons";
import { useLocalStorage } from "#context";

const sectionMenuItems = [
  {
    label: "Usage guide",
    icon: mdiBookOpenBlankVariant,
    link: "https://docs.vrite.io"
  },
  {
    label: "API Docs",
    icon: mdiApi,
    link: "https://generator.swagger.io/?url=https://api.vrite.io/swagger.json"
  },
  { label: "GitHub", icon: mdiGithub, link: "https://github.com/vriteio/vrite" },
  { label: "Discord", icon: discordIcon, link: "https://discord.gg/yYqDWyKnqE" }
];
const GettingStartedView: Component = () => {
  const { setStorage } = useLocalStorage();

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div class="flex justify-start items-start mb-4 px-5 flex-col pt-5">
        <div class="flex justify-center items-center">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                sidePanelWidth: 0
              }));
            }}
          />
          <Heading level={1}>Welcome to Vrite!</Heading>
        </div>
      </div>
      <div class="flex-col h-full relative flex overflow-hidden">
        <div class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5 mb-5">
          <div class="flex justify-start flex-col min-h-full items-start w-full gap-5">
            <div class="grid grid-cols-1 @lg:grid-cols-2 w-full gap-4">
              <For each={sectionMenuItems}>
                {(menuItem) => {
                  return (
                    <a href={menuItem.link} target="_blank">
                      <Button
                        class="h-28 w-full flex flex-col justify-center items-center m-0 disabled:opacity-50"
                        text="soft"
                        badge
                      >
                        <Icon path={menuItem.icon} class="h-8 w-8" />
                        {menuItem.label}
                      </Button>
                    </a>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { GettingStartedView };
