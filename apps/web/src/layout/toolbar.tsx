import {
  mdiAccountCircle,
  mdiBookOpenBlankVariant,
  mdiChevronRight,
  mdiFolder,
  mdiFullscreen,
  mdiGithub,
  mdiHexagonSlice6,
  mdiMenu,
  mdiViewDashboard,
  mdiViewList
} from "@mdi/js";
import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { HocuspocusProvider } from "@hocuspocus/provider";
import clsx from "clsx";
import { createStore } from "solid-js/store";
import { JSONContent } from "@vrite/sdk";
import Sortable from "sortablejs";
import {
  App,
  useAuthenticatedUserData,
  useCache,
  useClient,
  useLocalStorage,
  useSharedState
} from "#context";
import { ExportMenu, StatsMenu } from "#views/editor/menus";
import { Button, Dropdown, Icon, IconButton, Tooltip } from "#components/primitives";
import { logoIcon } from "#assets/icons";
import { breakpoints } from "#lib/utils";
import { useContentGroups } from "#lib/composables";

interface UserAwarenessData {
  awarenessId: number;
  id: string;
  name?: string;
  avatar?: string;
  selectionColor: string;
}

const profileOutlineColors = {
  red: "ring-red-500",
  orange: "ring-orange-500",
  amber: "ring-amber-500",
  purple: "ring-purple-500",
  indigo: "ring-indigo-500",
  blue: "ring-blue-500",
  cyan: "ring-cyan-500",
  green: "ring-green-500",
  teal: "ring-teal-500",
  lime: "ring-lime-500",
  emerald: "ring-emerald-500"
};
const profileIconColors = {
  red: "text-red-500",
  orange: "text-orange-500",
  amber: "text-amber-500",
  purple: "text-purple-500",
  indigo: "text-indigo-500",
  blue: "text-blue-500",
  cyan: "text-cyan-500",
  green: "text-green-500",
  teal: "text-teal-500",
  lime: "text-lime-500",
  emerald: "text-emerald-500"
};
const UserList: Component<{ provider?: HocuspocusProvider }> = (props) => {
  const { profile } = useAuthenticatedUserData();
  const [state, setState] = createStore<{
    users: UserAwarenessData[];
  }>({ users: [] });
  const shownUsers = createMemo(() => {
    return state.users.slice(0, 7);
  });

  createEffect(() => {
    if (!props.provider) return;

    const { awareness } = props.provider;
    const updateUserList = (data: {
      added: number[];
      updated: number[];
      removed: number[];
    }): void => {
      if (!awareness) return;

      const userStates = awareness.getStates();

      data.updated.forEach((index) => {
        const { user } = userStates.get(index) || {};
        const userIndex = state.users.findIndex((u) => u.id === user.id);

        if (userIndex !== -1) {
          setState("users", userIndex, user);
        }
      });
      setState("users", (users) => [
        ...users,
        ...data.added.map((awarenessId) => {
          const { user } = userStates.get(awarenessId) || {};

          return { awarenessId, ...user };
        })
      ]);

      if (data.removed.length > 0) {
        setState("users", (users) => {
          return users.filter((user) => {
            return !data.removed.includes(user.awarenessId);
          });
        });
      }
    };
    const users = [...awareness.getStates().entries()].map(([awarenessId, state]) => {
      return {
        awarenessId,
        ...state.user
      };
    }) as UserAwarenessData[];

    setState("users", users);
    awareness.on("change", updateUserList);
    onCleanup(() => {
      if (!awareness) return;

      awareness.off("change", updateUserList);
    });
  });

  return (
    <div class="flex">
      <For each={shownUsers()}>
        {(user) => {
          return (
            <Show when={profile()?.id !== user.id}>
              <Tooltip
                text={user.name || ""}
                class="mt-1"
                enabled={Boolean(user.name)}
                wrapperClass="hover:z-50"
              >
                <div
                  class={clsx(
                    "h-8 w-8 overflow-hidden rounded-full",
                    user.selectionColor && "ring-2 ring-opacity-80",
                    profileOutlineColors[user.selectionColor as keyof typeof profileOutlineColors]
                  )}
                >
                  <Show
                    when={user.avatar}
                    fallback={
                      <Icon
                        path={mdiAccountCircle}
                        class={clsx(
                          profileIconColors[user.selectionColor as keyof typeof profileIconColors]
                        )}
                      />
                    }
                  >
                    <img src={user.avatar} />
                  </Show>
                </div>
              </Tooltip>
            </Show>
          );
        }}
      </For>
      <Show when={state.users.length !== shownUsers().length}>
        <div
          class={clsx(
            "h-8 w-8 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 ring-2 ring-gray-200 dark:ring-gray-700 text-sm overflow-hidden rounded-full flex justify-center items-center font-bold z-1"
          )}
        >
          +{state.users.length - shownUsers().length}
        </div>
      </Show>
    </div>
  );
};
const Breadcrumb: Component<{
  ancestor?: App.ContentGroup | null;
  setAncestor?(contentGroup: App.ContentGroup | null): void;
}> = (props) => {
  const client = useClient();
  const cache = useCache();
  const { contentGroups, setContentGroups } = cache("contentGroups", () => {
    return useContentGroups();
  });
  const [highlight, setHighlight] = createSignal("");
  const [renderedAncestors, setRenderedAncestors] = createSignal<App.ContentGroup[]>([]);

  createEffect(
    on(
      () => props.ancestor,
      async (ancestor) => {
        if (ancestor) {
          const ancestors = await client.contentGroups.listAncestors.query({
            contentGroupId: ancestor.id || ""
          });

          setRenderedAncestors([...ancestors, ancestor]);
        } else {
          setRenderedAncestors([]);
        }
      }
    )
  );

  return (
    <div class="hidden md:flex bg-gray-200 dark:bg-gray-900 rounded-lg">
      <Show when={props.ancestor && props.setAncestor}>
        <IconButton
          path={mdiHexagonSlice6}
          variant="text"
          text="soft"
          class="m-0"
          onClick={() => {
            props.setAncestor!(null);
          }}
        />
        <IconButton
          path={mdiChevronRight}
          variant="text"
          text="soft"
          class="m-0 p-0"
          badge
          hover={false}
        />
        <For each={renderedAncestors()}>
          {(ancestor) => (
            <>
              <div>
                <IconButton
                  variant={highlight() === ancestor.id ? "solid" : "text"}
                  text={highlight() === ancestor.id ? "primary" : "soft"}
                  color={highlight() === ancestor.id ? "primary" : "base"}
                  class="m-0"
                  path={mdiFolder}
                  label={ancestor.name}
                  onClick={() => props.setAncestor!(ancestor)}
                  ref={(el) => {
                    let sorting = false;

                    if (props.ancestor.id === ancestor.id) return;

                    setTimeout(() => {
                      Sortable.create(el.parentElement, {
                        group: "shared",
                        ghostClass: "!hidden",
                        onStart() {
                          sorting = true;
                        },
                        onEnd() {
                          sorting = false;
                        },
                        onAdd(evt) {
                          const el = evt.item;

                          console.log(el.parentNode);
                          el.parentNode.removeChild(el);
                          setHighlight("");
                          client.contentGroups.move.mutate({
                            id: el.dataset.contentGroupId || "",
                            ancestor: ancestor.id
                          });
                          setContentGroups(
                            contentGroups().filter(
                              (contentGroup) => contentGroup.id !== el.dataset.contentGroupId
                            )
                          );
                        }
                      });

                      const targetElement = el!;

                      console.log(el);
                      targetElement.addEventListener("dragover", function (evt) {
                        evt.preventDefault();
                      });
                      targetElement.addEventListener("dragenter", function (evt) {
                        console.log("dragenter", evt.relatedTarget);

                        if (!targetElement.contains(evt.relatedTarget)) {
                          // Here is where you add the styling of targetElement;
                          setHighlight(ancestor.id);
                        }
                      });
                      targetElement.addEventListener("dragleave", function (evt) {
                        if (!targetElement.contains(evt.relatedTarget)) {
                          // Here is where you remove the styling of targetElement
                          setHighlight("");
                        }
                      });
                    }, 3000);
                  }}
                ></IconButton>
              </div>
              <Show when={ancestor.id !== props.ancestor!.id}>
                <IconButton
                  path={mdiChevronRight}
                  variant="text"
                  text="soft"
                  class="m-0 p-0"
                  badge
                  hover={false}
                />
              </Show>
            </>
          )}
        </For>
      </Show>
    </div>
  );
};
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
    const [sharedProvider] = createSharedSignal("provider");
    const [sharedAncestor, setSharedAncestor] = createSharedSignal("ancestor");
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
        <Breadcrumb ancestor={sharedAncestor()} setAncestor={setSharedAncestor} />
        <div class="flex-1" />
        <Show when={sharedProvider()}>
          <UserList provider={sharedProvider()!} />
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
