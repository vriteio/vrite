import { UserList } from "./user-list";
import { RightPanelMenu } from "./right-panel-menu";
import { Breadcrumb } from "./breadcrumb";
import { ExportMenu } from "./export-menu";
import {
  mdiAppleKeyboardCommand,
  mdiBookOpenBlankVariant,
  mdiConsoleLine,
  mdiFileOutline,
  mdiFullscreen,
  mdiGithub,
  mdiMagnify,
  mdiMenu,
  mdiViewDashboard,
  mdiViewList
} from "@mdi/js";
import { Component, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";
import { JSONContent } from "@vrite/sdk";
import {
  useClient,
  useCommandPalette,
  useContentData,
  useHostConfig,
  useLocalStorage,
  useNotifications,
  useSharedState
} from "#context";
import { Button, Dropdown, Icon, IconButton, Tooltip } from "#components/primitives";
import { logoIcon } from "#assets/icons";
import { breakpoints, isAppleDevice } from "#lib/utils";

const toolbarViews: Record<string, Component<Record<string, any>>> = {
  editorStandalone: () => {
    const { useSharedSignal } = useSharedState();
    const [sharedEditor] = useSharedSignal("editor");
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
              <Button color="primary" link="https://app.vrite.io" class="m-0 whitespace-nowrap">
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
                    class="m-0 justify-start w-full whitespace-nowrap"
                    variant="text"
                    text="soft"
                    path={mdiFullscreen}
                    label="Zen mode"
                  />
                  <IconButton
                    path={mdiBookOpenBlankVariant}
                    class="m-0 justify-start w-full whitespace-nowrap"
                    variant="text"
                    text="soft"
                    label="Usage guide"
                    link="https://docs.vrite.io/usage-guide/content-editor"
                    target="_blank"
                  />
                  <IconButton
                    class="m-0 justify-start w-full whitespace-nowrap"
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
              <ExportMenu content={sharedEditor()!.getJSON() as JSONContent} />
            </Show>
            <IconButton
              onClick={() => {
                setStorage((storage) => ({ ...storage, zenMode: true }));
              }}
              class="m-0 whitespace-nowrap"
              variant="text"
              text="soft"
              path={mdiFullscreen}
              label="Zen mode"
            />
            <Tooltip text="Usage guide" class="mt-1">
              <IconButton
                path={mdiBookOpenBlankVariant}
                class="m-0 whitespace-nowrap"
                variant="text"
                text="soft"
                link="https://docs.vrite.io/usage-guide/content-editor"
                target="_blank"
              />
            </Tooltip>

            <Tooltip text="Star on GitHub" class="mt-1">
              <IconButton
                class="m-0 whitespace-nowrap"
                link="https://github.com/vriteio/vrite"
                path={mdiGithub}
                variant="text"
                text="soft"
                target="_blank"
              ></IconButton>
            </Tooltip>
            <Button color="primary" link="https://app.vrite.io" class="m-0 whitespace-nowrap">
              Sign in
            </Button>
          </div>
        </Show>
      </div>
    );
  },
  conflict: () => {
    const { useSharedSignal } = useSharedState();
    const client = useClient();
    const { notify } = useNotifications();
    const [resolvedContent] = useSharedSignal("resolvedContent");
    const [conflictData, setConflictData] = useSharedSignal("conflictData");
    const [conflicts, setConflicts] = useSharedSignal("conflicts");
    const [loading, setLoading] = createSignal(false);
    const pathDetails = createMemo(() => {
      const pathParts = (conflictData()?.path || "").split("/");
      const fileName = pathParts.pop()!;
      const directory = pathParts.filter(Boolean).join("/");

      return { fileName, directory };
    });

    return (
      <div class="flex-row flex justify-start items-center px-4 w-full gap-2">
        <Show when={conflictData()}>
          <IconButton
            path={mdiFileOutline}
            class="m-0 mr-1 whitespace-nowrap"
            variant="text"
            label={pathDetails().fileName}
          />
          <span class="text-gray-500 dark:text-gray-400 text-sm clamp-1 flex-1">
            {pathDetails().directory}
          </span>
          <div class="flex-1" />
          <Button
            color="primary"
            class="m-0 whitespace-nowrap"
            loading={loading()}
            onClick={async () => {
              try {
                setLoading(true);
                await client.git.resolveConflict.mutate({
                  content: resolvedContent()!,
                  contentPieceId: conflictData()!.contentPieceId,
                  hash: conflictData()!.pulledHash,
                  path: conflictData()!.path
                });
                setConflicts(
                  (conflicts() || []).filter((conflict) => conflict.path !== conflictData()?.path)
                );
                setConflictData(null);
                setLoading(false);
                notify({ text: "Conflict resolved", type: "success" });
              } catch (error) {
                setLoading(false);
                notify({ text: "Couldn't resolve conflict", type: "error" });
              }
            }}
          >
            Resolve
          </Button>
        </Show>
      </div>
    );
  },
  editor: () => {
    const { activeContentPieceId, contentPieces } = useContentData();
    const { useSharedSignal } = useSharedState();
    const { registerCommand } = useCommandPalette();
    const [sharedProvider] = useSharedSignal("provider");
    const { storage, setStorage } = useLocalStorage();
    const [menuOpened, setMenuOpened] = createSignal(false);

    createEffect(
      on(activeContentPieceId, (contentPieceId) => {
        if (contentPieceId) {
          registerCommand({
            name: "Zen mode",
            category: "editor",
            icon: mdiFullscreen,
            action() {
              setStorage((storage) => ({ ...storage, zenMode: true }));
            }
          });
        }
      })
    );

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
                <Show when={activeContentPieceId() && contentPieces[activeContentPieceId() || ""]}>
                  <ExportMenu
                    editedContentPiece={contentPieces[activeContentPieceId() || ""]!}
                    onClick={() => setMenuOpened(false)}
                    class="w-full justify-start"
                    wrapperClass="w-full"
                  />
                  <IconButton
                    onClick={() => {
                      setMenuOpened(false);
                      setStorage((storage) => ({ ...storage, zenMode: true }));
                    }}
                    class="m-0 w-full md:w-auto justify-start md:justify-center whitespace-nowrap"
                    variant="text"
                    text="soft"
                    path={mdiFullscreen}
                    label="Zen mode"
                  />
                </Show>
              </div>
            </Dropdown>
          }
        >
          <Show when={activeContentPieceId() && contentPieces[activeContentPieceId() || ""]}>
            <ExportMenu editedContentPiece={contentPieces[activeContentPieceId() || ""]!} />
            <IconButton
              onClick={() => {
                setStorage((storage) => ({ ...storage, zenMode: true }));
              }}
              class="m-0 w-full md:w-auto justify-start md:justify-center whitespace-nowrap"
              variant="text"
              text="soft"
              path={mdiFullscreen}
              label="Zen mode"
            />
            <RightPanelMenu variant="text" />
          </Show>
        </Show>
      </div>
    );
  },
  default: () => {
    const hostConfig = useHostConfig();
    const { useSharedSignal } = useSharedState();
    const { storage, setStorage } = useLocalStorage();
    const { open, registerCommand } = useCommandPalette();
    const [provider] = useSharedSignal("provider");
    const [viewSelectorOpened, setViewSelectorOpened] = createSignal(false);
    const view = (): string => storage().dashboardView || "kanban";
    const setView = (view: string): void => {
      setStorage((storage) => ({ ...storage, dashboardView: view }));
    };

    createEffect(() => {
      if (view() === "table") {
        registerCommand({
          action: () => setView("kanban"),
          category: "dashboard",
          icon: mdiViewDashboard,
          name: "Switch to Kanban view"
        });
      } else {
        registerCommand({
          action: () => setView("table"),
          category: "dashboard",
          icon: mdiViewList,
          name: "Switch to Table view"
        });
      }
    });

    return (
      <div class="flex justify-end items-center w-full px-4 gap-2">
        <Dropdown
          opened={viewSelectorOpened()}
          setOpened={setViewSelectorOpened}
          activatorButton={() => {
            return (
              <IconButton
                path={view() === "kanban" ? mdiViewDashboard : mdiViewList}
                class="m-0 whitespace-nowrap"
                label={view() === "kanban" ? "Kanban" : "Table"}
                text="soft"
              />
            );
          }}
        >
          <div class="flex flex-col">
            <IconButton
              onClick={() => {
                setView("kanban");
                setViewSelectorOpened(false);
              }}
              path={mdiViewDashboard}
              class="w-full m-0 justify-start whitespace-nowrap"
              label="Kanban"
              variant="text"
              text={view() === "kanban" ? "base" : "soft"}
              color={view() === "kanban" ? "primary" : "base"}
            />
            <IconButton
              onClick={() => {
                setView("table");
                setViewSelectorOpened(false);
              }}
              path={mdiViewList}
              class="w-full m-0 justify-start whitespace-nowrap"
              label="Table"
              variant="text"
              text={view() === "table" ? "base" : "soft"}
              color={view() === "table" ? "primary" : "base"}
            />
          </div>
        </Dropdown>
        <Breadcrumb />
        <div class="flex-1" />
        <Show when={provider()}>
          <UserList provider={provider()!} />
        </Show>
        <IconButton
          path={hostConfig.search ? mdiMagnify : mdiConsoleLine}
          label={
            <div class="flex w-full items-center">
              <span class="pl-1 flex-1 text-start whitespace-nowrap">
                {hostConfig.search ? "Search" : "Command"}
              </span>
              <kbd class="bg-gray-300 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-800 flex justify-center items-center rounded-md px-1 h-5 text-sm">
                {isAppleDevice() ? (
                  <Icon path={mdiAppleKeyboardCommand} class="h-3 w-3" />
                ) : (
                  "Ctrl "
                )}
                K
              </kbd>
            </div>
          }
          text="soft"
          class="hidden @xl:flex @xl:min-w-48 justify-start m-0 bg-gray-200 group"
          onClick={() => {
            // Force mobile keyboard to open (focus must be in user-triggered event handler)
            document.getElementById("command-palette-input")?.focus({ preventScroll: true });
            open();
          }}
        />
        <RightPanelMenu />
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
        ":base-2: p-1 w-full flex items-center border-b-2 absolute h-12 border-gray-200 dark:border-gray-700 justify-end @container z-10",
        props.class
      )}
    >
      <Dynamic component={view()} />
    </div>
  );
};

export { Toolbar };
