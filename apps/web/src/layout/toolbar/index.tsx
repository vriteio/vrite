import { UserList } from "./user-list";
import { Breadcrumb } from "./breadcrumb";
import {
  mdiBookOpenBlankVariant,
  mdiFullscreen,
  mdiGithub,
  mdiMenu,
  mdiViewDashboard,
  mdiViewList
} from "@mdi/js";
import { Component, Show, createMemo, createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";
import { JSONContent } from "@vrite/sdk";
import { useLocalStorage, useSharedState } from "#context";
import { ExportMenu, StatsMenu } from "#views/editor/menus";
import { Button, Dropdown, IconButton, Tooltip } from "#components/primitives";
import { logoIcon } from "#assets/icons";
import { breakpoints } from "#lib/utils";

const toolbarViews: Record<string, Component<Record<string, any>>> = {
  editorStandalone: () => {
    const createSharedSignal = useSharedState();
    const [sharedEditor] = createSharedSignal("editor");
    const { setStorage } = useLocalStorage();
    const [menuOpened, setMenuOpened] = createSignal(false);

    return (
      <div class="flex justify-start items-center px-2 w-full gap-2">
        <div class="flex items-center justify-start">
          <IconButton
            path={logoIcon}
            color="primary"
            link="https://vrite.io"
            class="bg-gradient-to-tr"
          />
          <span class="flex-1 text-2xl font-extrabold text-gray-600 dark:text-gray-200">rite</span>
        </div>
        <div class="flex-1" />
        <Show
          when={breakpoints.md()}
          fallback={
            <>
              <Button color="primary" link="https://app.vrite.io" class="m-0">
                Sign in
              </Button>
              <Dropdown
                opened={menuOpened()}
                setOpened={setMenuOpened}
                activatorButton={() => (
                  <IconButton path={mdiMenu} text="soft" class="flex-row-reverse m-0" />
                )}
              >
                <div class="gap-1 flex flex-col">
                  <Show when={sharedEditor()}>
                    <StatsMenu
                      editor={sharedEditor()!}
                      onClick={() => setMenuOpened(false)}
                      class="w-full justify-start"
                      wrapperClass="w-full"
                    />
                    <ExportMenu
                      content={sharedEditor()!.getJSON() as JSONContent}
                      onClick={() => setMenuOpened(false)}
                      class="w-full justify-start"
                      wrapperClass="w-full"
                    />
                  </Show>
                  <IconButton
                    onClick={() => {
                      setStorage((storage) => ({ ...storage, zenMode: true }));
                    }}
                    class="m-0 justify-start w-full"
                    variant="text"
                    text="soft"
                    path={mdiFullscreen}
                    label="Zen mode"
                  />
                  <IconButton
                    path={mdiBookOpenBlankVariant}
                    class="m-0 justify-start w-full"
                    variant="text"
                    text="soft"
                    label="Usage guide"
                    link="https://docs.vrite.io/content-editor"
                    target="_blank"
                  />
                  <IconButton
                    class="m-0 justify-start w-full"
                    link="https://github.com/vriteio/vrite"
                    path={mdiGithub}
                    variant="text"
                    text="soft"
                    label="Star on GitHub"
                    target="_blank"
                  ></IconButton>
                </div>
              </Dropdown>
            </>
          }
        >
          <div class="gap-2 flex">
            <Show when={sharedEditor()}>
              <StatsMenu editor={sharedEditor()!} />
              <ExportMenu content={sharedEditor()!.getJSON() as JSONContent} />
            </Show>
            <IconButton
              onClick={() => {
                setStorage((storage) => ({ ...storage, zenMode: true }));
              }}
              class="m-0"
              variant="text"
              text="soft"
              path={mdiFullscreen}
              label="Zen mode"
            />
            <Tooltip text="Usage guide" class="mt-1">
              <IconButton
                path={mdiBookOpenBlankVariant}
                class="m-0"
                variant="text"
                text="soft"
                link="https://docs.vrite.io/content-editor"
                target="_blank"
              />
            </Tooltip>

            <Tooltip text="Star on GitHub" class="mt-1">
              <IconButton
                class="m-0"
                link="https://github.com/vriteio/vrite"
                path={mdiGithub}
                variant="text"
                text="soft"
                target="_blank"
              ></IconButton>
            </Tooltip>
            <Button color="primary" link="https://app.vrite.io" class="m-0">
              Sign in
            </Button>
          </div>
        </Show>
      </div>
    );
  },
  editor: () => {
    const createSharedSignal = useSharedState();
    const [sharedEditor] = createSharedSignal("editor");
    const [sharedProvider] = createSharedSignal("provider");
    const [sharedEditedContentPiece] = createSharedSignal("editedContentPiece");
    const { setStorage } = useLocalStorage();
    const [menuOpened, setMenuOpened] = createSignal(false);

    return (
      <div class="flex-row flex justify-start items-center px-4 w-full gap-2">
        <Show when={sharedProvider()}>
          <UserList provider={sharedProvider()!} />
        </Show>
        <div class="flex-1" />
        <Show
          when={breakpoints.md()}
          fallback={
            <Dropdown
              opened={menuOpened()}
              setOpened={setMenuOpened}
              activatorButton={() => (
                <IconButton path={mdiMenu} text="soft" variant="text" class="flex-row-reverse" />
              )}
            >
              <div class="overflow-hidden w-full h-full flex flex-col gap-1">
                <Show when={sharedEditor()}>
                  <StatsMenu
                    editor={sharedEditor()!}
                    onClick={() => setMenuOpened(false)}
                    class="w-full justify-start"
                    wrapperClass="w-full"
                  />
                </Show>
                <Show when={sharedEditedContentPiece()}>
                  <ExportMenu
                    editedContentPiece={sharedEditedContentPiece()!}
                    onClick={() => setMenuOpened(false)}
                    class="w-full justify-start"
                    wrapperClass="w-full"
                  />
                </Show>
                <IconButton
                  onClick={() => {
                    setMenuOpened(false);
                    setStorage((storage) => ({ ...storage, zenMode: true }));
                  }}
                  class="m-0 w-full md:w-auto justify-start md:justify-center"
                  variant="text"
                  text="soft"
                  path={mdiFullscreen}
                  label="Zen mode"
                />
              </div>
            </Dropdown>
          }
        >
          <Show when={sharedEditor()}>
            <StatsMenu editor={sharedEditor()!} />
          </Show>
          <Show when={sharedEditedContentPiece()}>
            <ExportMenu editedContentPiece={sharedEditedContentPiece()!} />
          </Show>
          <IconButton
            onClick={() => {
              setStorage((storage) => ({ ...storage, zenMode: true }));
            }}
            class="m-0 w-full md:w-auto justify-start md:justify-center"
            variant="text"
            text="soft"
            path={mdiFullscreen}
            label="Zen mode"
          />
        </Show>
      </div>
    );
  },
  default: () => {
    const createSharedSignal = useSharedState();
    const [provider] = createSharedSignal("provider");
    const [ancestor, setAncestor] = createSharedSignal("ancestor");
    const [activeDraggableGroup] = createSharedSignal("activeDraggableGroup");
    const [viewSelectorOpened, setViewSelectorOpened] = createSignal(false);
    const [view, setView] = createSharedSignal("dashboardView", "kanban");

    return (
      <div class="flex justify-end items-center w-full px-4 gap-2">
        <Dropdown
          opened={viewSelectorOpened()}
          setOpened={setViewSelectorOpened}
          activatorButton={() => {
            return (
              <IconButton
                path={view() === "kanban" ? mdiViewDashboard : mdiViewList}
                class="m-0"
                label={view() === "kanban" ? "Kanban" : "List"}
                text="soft"
              />
            );
          }}
        >
          <div class="gap-1 flex flex-col">
            <IconButton
              onClick={() => {
                setView("kanban");
                setViewSelectorOpened(false);
              }}
              path={mdiViewDashboard}
              class="w-full m-0 justify-start"
              label="Kanban"
              variant={view() === "kanban" ? "solid" : "text"}
              text={view() === "kanban" ? "primary" : "soft"}
              color={view() === "kanban" ? "primary" : "base"}
            />
            <IconButton
              onClick={() => {
                setView("list");
                setViewSelectorOpened(false);
              }}
              path={mdiViewList}
              class="w-full m-0 justify-start"
              label="List"
              variant={view() === "list" ? "solid" : "text"}
              text={view() === "list" ? "primary" : "soft"}
              color={view() === "list" ? "primary" : "base"}
            />
          </div>
        </Dropdown>
        <Breadcrumb
          ancestor={ancestor()}
          activeDraggableGroup={activeDraggableGroup()}
          setAncestor={setAncestor}
        />
        <div class="flex-1" />
        <Show when={provider()}>
          <UserList provider={provider()!} />
        </Show>
      </div>
    );
  }
};
const Toolbar: Component<{ class?: string }> = (props) => {
  const { storage } = useLocalStorage();
  const view = createMemo(() => {
    return toolbarViews[storage().toolbarView || "default"];
  });

  return (
    <div
      class={clsx(
        ":base-2: p-1 w-full flex items-center border-b-2 absolute h-12 border-gray-200 dark:border-gray-700 justify-end",
        props.class
      )}
    >
      <Dynamic component={view()} />
    </div>
  );
};

export { Toolbar };
