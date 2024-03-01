import {
  mdiBookOpenBlankVariant,
  mdiClose,
  mdiFormatListBulleted,
  mdiGithub,
  mdiPlayCircle,
  mdiPuzzle,
  mdiSchool
} from "@mdi/js";
import { Component, For } from "solid-js";
import clsx from "clsx";
import { Card, Heading, Icon, IconButton } from "#components/primitives";
import { discordIcon } from "#assets/icons";
import { useLocalStorage } from "#context";
import { TitledCard } from "#components/fragments";
import { apiIcon } from "#assets/icons/api";
import { useWalkthrough } from "#layout/walkthrough";

const sectionMenuItems = [
  {
    label: "Product Documentation",
    icon: mdiBookOpenBlankVariant,
    link: "https://docs.vrite.io/getting-started/introduction/"
  },
  {
    label: "API Reference",
    icon: apiIcon,
    link: "https://docs.vrite.io/api/authentication/"
  },
  { label: "Star on GitHub", icon: mdiGithub, link: "https://github.com/vriteio/vrite" },
  { label: "Join Discord", icon: discordIcon, link: "https://discord.gg/yYqDWyKnqE" }
];
const GettingStartedView: Component = () => {
  const { setStorage } = useLocalStorage();
  const { activeWalkthrough, setActiveWalkthrough } = useWalkthrough();
  const walkthroughs = [
    {
      icon: mdiPlayCircle,
      name: "Create your first content piece",
      url: "https://docs.vrite.io/usage-guide/content-editor"
    },
    {
      icon: mdiGithub,
      name: "Sync with GitHub"
    },
    {
      icon: mdiPuzzle,
      name: "Auto-publishing with Vrite Extensions"
    }
  ];

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
          <Heading level={1} class="py-1">
            Welcome
          </Heading>
        </div>
        <p>Get started, learn more and explore the latest features of Vrite.</p>
      </div>
      <div class="flex-col h-full relative flex overflow-hidden">
        <div class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5">
          <div class="flex justify-start flex-col min-h-full items-start w-full gap-5 pb-5">
            {/* <TitledCard label="Walkthroughs" icon={mdiSchool}>
              <For each={walkthroughs}>
                {({ name, url, icon }) => {
                  const active = (): boolean => activeWalkthrough() === url;

                  return (
                    <button
                      class="w-full"
                      onClick={() => {
                        if (url) {
                          if (activeWalkthrough() === url) {
                            setActiveWalkthrough(null);
                          } else {
                            setActiveWalkthrough(url);
                          }
                        }
                      }}
                    >
                      <Card
                        color={active() ? "primary" : "contrast"}
                        class="text-start flex-col relative flex m-0 w-full justify-center items-start @hover-bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <div class="flex gap-1 items-center">
                          <Icon
                            path={icon}
                            class={clsx("h-5 w-5", !active() && "text-gray-500 dark:text-gray-400")}
                          />
                          <h4 class="break-anywhere flex-1 clamp-1" title={name}>
                            {name}
                          </h4>
                        </div>
                      </Card>
                    </button>
                  );
                }}
              </For>
            </TitledCard>*/}
            <TitledCard label="Resources" icon={mdiFormatListBulleted}>
              <div class="flex flex-col gap-2 w-full">
                <For each={sectionMenuItems}>
                  {(menuItem) => {
                    return (
                      <a href={menuItem.link} target="_blank">
                        <Card
                          color="contrast"
                          class="text-start flex-col relative flex m-0 w-full justify-center items-start @hover-bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <div class="flex gap-1 items-center">
                            <Icon
                              path={menuItem.icon}
                              class="h-5 w-5 text-gray-500 dark:text-gray-400"
                            />
                            <h4 class="break-anywhere flex-1 clamp-1">{menuItem.label}</h4>
                          </div>
                        </Card>
                      </a>
                    );
                  }}
                </For>
              </div>
            </TitledCard>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { GettingStartedView };
