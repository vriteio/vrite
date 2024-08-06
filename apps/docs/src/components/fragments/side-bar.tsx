import { mdiMenu, mdiClose, mdiChevronDown } from "@mdi/js";
import clsx from "clsx";
import {
  Component,
  For,
  JSX,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal
} from "solid-js";
import { Tree, TreeItem } from "@vrite/solid-ui";
import type { ContentTreeBranch, ContentMetadata } from "vrite:pages";
import { menuOpened, setMenuOpened } from "#lib/state";
import { Card, Button, IconButton } from "#components/primitives";
import { logoIcon } from "#assets/icons/logo";

interface SideBarProps {
  sections: Array<{
    label: string;
    icon: string;
    link: string;
    active?: boolean;
  }>;
  menu: {
    branches: ContentTreeBranch[];
    contentMetadata: ContentMetadata[];
  };
  currentPath: string;
}
interface MenuLevel {
  label: string;
  link?: string;
  menu?: MenuLevel[];
}
interface SideBarNestedMenuProps {
  menu: ContentTreeBranch[];
  currentPath: string;
}

const SideBarNestedMenu: Component<SideBarNestedMenuProps> = (props) => {
  const currentPath = (): string => props.currentPath.replace(/(^\/)|(\/$)/g, "");
  const [expanded, setExpanded] = createSignal<string[]>([currentPath()]);
  const items = createMemo<TreeItem[]>(() => {
    const processMenuLevel = (
      menuLevel: ContentTreeBranch[],
      collapsible = true,
      level = 1
    ): TreeItem[] => {
      return menuLevel.map((item) => {
        const children = [
          ...processMenuLevel(item.branches || [], true, level + 1),
          ...(item.contentMetadata || []).map((content) => {
            return {
              label: content.title,
              id: content.slug,
              data: {
                link: content.slug.startsWith("/") ? content.slug : `/${content.slug}`
              }
            };
          })
        ];

        return {
          label: item.branchName,
          collapsible,
          id: `${item.branchName}:${level}`,
          children: children.length > 0 ? children : undefined
        };
      });
    };

    return processMenuLevel(props.menu, false);
  });

  return (
    <Tree.Root<{ link: string }>
      items={items()}
      collapsible
      expanded={expanded()}
      setExpanded={setExpanded}
    >
      {(props) => {
        const isExpanded = (): boolean => props.isExpanded;
        const label = (): string => props.item.label;
        const active = (): boolean => {
          const link = (props.item.data?.link || "").replace(/(^\/)|(\/$)/g, "");

          return Boolean(props.item.data?.link && currentPath() === link);
        };

        return (
          <div class="flex flex-col w-full">
            <Switch>
              <Match when={props.item.data?.link}>
                {(link) => {
                  return (
                    <Button
                      variant={active() ? "solid" : "text"}
                      class="text-start w-full m-0 @hover:bg-gray-200 @hover:dark:bg-gray-700"
                      text={active() ? "primary" : "soft"}
                      color={active() ? "primary" : "base"}
                      link={link()}
                      target={link()?.startsWith("http") ? "_blank" : "_self"}
                      hover={false}
                    >
                      {props.item.label}
                    </Button>
                  );
                }}
              </Match>
              <Match when={props.item.collapsible}>
                <Tree.Item
                  item={props.item}
                  as={(props) => {
                    return (
                      <Button
                        class="flex justify-center items-center text-start w-full group m-0 @hover:bg-gray-200 @hover:dark:bg-gray-700"
                        onClick={props.onClick}
                        variant="text"
                        hover={false}
                        text="soft"
                      >
                        <div class="flex-1">{label()}</div>
                        <IconButton
                          path={mdiChevronDown}
                          class="m-0 p-0"
                          variant="text"
                          text="soft"
                          badge
                          iconProps={{
                            class: clsx(
                              "transform transition-transform duration-100 h-5 w-5",
                              isExpanded() ? "" : "-rotate-90"
                            )
                          }}
                        />
                      </Button>
                    );
                  }}
                />
              </Match>
              <Match when={true}>
                <Button
                  variant="text"
                  class="justify-start w-full font-bold m-0"
                  badge
                  hover={false}
                >
                  {props.item.label}
                </Button>
              </Match>
            </Switch>
            <Show when={props.item.children?.length}>
              <div
                class={clsx(
                  "flex flex-1 w-full overflow-hidden",
                  props.item.collapsible && "pl-3.25",
                  props.isExpanded ? "max-h-full" : "max-h-0"
                )}
              >
                <div class="pt-1 flex w-full">
                  <Show when={props.item.collapsible}>
                    <div class="w-px rounded-full h-full bg-gray-200 dark:bg-gray-700" />
                  </Show>
                  <div class={clsx("flex-1 flex flex-col gap-1", props.item.collapsible && "pl-2")}>
                    {props.children}
                  </div>
                </div>
              </div>
            </Show>
          </div>
        );
      }}
    </Tree.Root>
  );
};
const SideBar: Component<SideBarProps> = (props) => {
  createEffect(() => {
    if (menuOpened()) {
      document.body.style.overflowY = "hidden";
    } else {
      document.body.style.overflowY = "auto";
    }
  });

  return (
    <>
      <div class={clsx("h-full fixed top-0 left-0 z-2", "pl-[max(0px,calc((100%-1536px)/2))]")}>
        <Card
          class={clsx(
            "top-0 h-full z-50 min-w-72 w-full md:max-w-72 m-0  bg-gray-50 dark:bg-gray-800",
            "flex-col gap-2 justify-start items-start border-0 rounded-none flex fixed md:relative",
            "transform md:transition-transform duration-300 ease-in-out scrollbar-sm-contrast overflow-auto",
            menuOpened() ? "" : "translate-y-[100vh] md:translate-y-0"
          )}
        >
          <div class="flex items-center justify-start px-2 w-[calc(100%+0.25rem)] -ml-1 py-2 rounded-xl top-0 relative z-1">
            <IconButton
              path={logoIcon}
              color="primary"
              link="/"
              class="bg-gradient-to-tr from-red-500 to-orange-500 m-0 mr-1"
            />
            <span class="text-start text-2xl font-extrabold text-gray-600 dark:text-gray-200">
              rite
            </span>
            <span class="text-gray-500 dark:text-gray-400 font-semibold border-l-2 pl-2 ml-2 leading-8 border-gray-200 dark:border-gray-700">
              Documentation
            </span>
          </div>
          <div class="flex flex-col gap-2 pl-1 w-full py-4">
            <For each={props.sections}>
              {(section) => {
                return (
                  <a
                    class="flex justify-start items-center group w-full cursor-pointer"
                    target={section.link.startsWith("http") ? "_blank" : "_self"}
                    href={section.link}
                  >
                    <IconButton
                      path={section.icon}
                      class="m-0 group-hover:bg-gray-300 dark:group-hover:bg-gray-700 h-8 w-8"
                      iconProps={{ class: "h-5 w-5" }}
                      color={section.active ? "primary" : "base"}
                      text={section.active ? "primary" : "soft"}
                    />
                    <span class=" ml-2 text-gray-500 dark:text-gray-400">{section.label}</span>
                  </a>
                );
              }}
            </For>
          </div>
          <SideBarNestedMenu
            currentPath={props.currentPath}
            menu={props.menu.branches}
          ></SideBarNestedMenu>
          <div class="min-h-24 md:min-h-unset md:flex-1" />
          <div class="flex sticky bottom-0 w-full">
            <IconButton
              path={logoIcon}
              variant="text"
              text="soft"
              hover={false}
              class="m-0 justify-start flex gap-1 pr-2 bg-gray-50 dark:bg-gray-800 bg-opacity-50 dark:bg-opacity-50 backdrop-blur-lg font-medium hover:text-gray-700 dark:hover:text-gray-50 hover:bg-gray-100 dark:hover:bg-gray-900"
              iconProps={{ class: "h-5 w-5 ml-0.5 fill-[url(#gradient)]" }}
              link="https://vrite.io"
              target="_blank"
              label="Powered by Vrite"
            />
          </div>
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
      </div>
      <div class="min-w-72 hidden md:block" />
    </>
  );
};

export { SideBar };
