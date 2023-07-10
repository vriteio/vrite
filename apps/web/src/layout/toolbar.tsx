import {
  mdiAccountCircle,
  mdiBookOpenBlankVariant,
  mdiFileDocument,
  mdiFullscreen,
  mdiGithub,
  mdiMenu
} from "@mdi/js";
import { Component, For, Show, createEffect, createMemo, onCleanup } from "solid-js";
import { Dynamic } from "solid-js/web";
import { HocuspocusProvider } from "@hocuspocus/provider";
import clsx from "clsx";
import { createStore } from "solid-js/store";
import { JSONContent } from "@vrite/sdk";
import { useAuthenticatedContext, useUIContext } from "#context";
import { ExportMenu, StatsMenu } from "#views/editor/menus";
import { Button, Dropdown, Icon, IconButton, Tooltip } from "#components/primitives";
import { logoIcon } from "#assets/icons";

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
  const { profile } = useAuthenticatedContext();
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
    <div class="flex pr-2">
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
const toolbarViews: Record<string, Component<Record<string, any>>> = {
  editorStandalone: () => {
    const { references, setStorage } = useUIContext();

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
        <div class="gap-2 hidden lg:flex">
          <Show when={references.editor}>
            <StatsMenu editor={references.editor!} />
            <ExportMenu content={references.editor!.getJSON() as JSONContent} />
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
      </div>
    );
  },
  editor: () => {
    const { references, setStorage } = useUIContext();

    return (
      <div class="flex-col md:flex-row flex justify-start items-start md:items-center md:px-4 w-full gap-2">
        <Show when={references.provider}>
          <UserList provider={references.provider!} />
        </Show>
        <div class="flex-1" />
        <Show when={references.editor}>
          <StatsMenu editor={references.editor!} />
        </Show>
        <Show when={references.editedContentPiece}>
          <ExportMenu editedContentPiece={references.editedContentPiece!} />
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
      </div>
    );
  },
  default: () => {
    const { references } = useUIContext();

    return (
      <div class="flex justify-end items-center w-full px-4">
        <Show when={references.provider}>
          <UserList provider={references.provider} />
        </Show>
        <div class="flex-1" />
      </div>
    );
  }
};
const Toolbar: Component<{ class?: string }> = (props) => {
  const { storage, breakpoints } = useUIContext();
  const view = createMemo(() => {
    return toolbarViews[storage().toolbarView || "default"];
  });

  return (
    <div
      class={clsx(
        ":base-2: p-1 w-full flex justify-center items-center border-b-2 absolute h-12 border-gray-200 dark:border-gray-700",
        "md:justify-center justify-end",
        props.class
      )}
    >
      <Show
        when={breakpoints.md()}
        fallback={
          <Dropdown
            activatorButton={() => (
              <IconButton
                path={mdiMenu}
                text="soft"
                variant="text"
                class="flex-row-reverse"
                label={<span class="mr-1">Menu</span>}
              />
            )}
          >
            <div class="overflow-hidden w-full h-full">
              <Dynamic component={view()} />
            </div>
          </Dropdown>
        }
      >
        <Dynamic component={view()} />
      </Show>
    </div>
  );
};

export { Toolbar };
