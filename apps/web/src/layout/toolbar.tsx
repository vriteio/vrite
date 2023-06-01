import { mdiAccountCircle, mdiFullscreen } from "@mdi/js";
import { Component, For, Show, createEffect, createMemo, onCleanup } from "solid-js";
import { Dynamic } from "solid-js/web";
import { HocuspocusProvider } from "@hocuspocus/provider";
import clsx from "clsx";
import { createStore } from "solid-js/store";
import { useAuthenticatedContext, useUIContext } from "#context";
import { ExportMenu, StatsMenu } from "#views/editor/menus";
import { Icon, IconButton, Tooltip } from "#components/primitives";

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
  editor: () => {
    const { references, setStorage } = useUIContext();

    return (
      <div class="flex justify-start items-center px-4 w-full gap-2">
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
          class="m-0"
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
const Toolbar: Component = () => {
  const { storage } = useUIContext();
  const view = createMemo(() => {
    return toolbarViews[storage().toolbarView || "default"];
  });

  return (
    <div
      color="contrast"
      class="p-1 w-full flex justify-center items-center border-b-2 absolute h-12 border-gray-200 dark:border-gray-700"
    >
      <Dynamic component={view()} />
    </div>
  );
};

export { Toolbar };
