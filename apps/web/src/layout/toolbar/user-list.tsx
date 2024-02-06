import { HocuspocusProvider } from "@hocuspocus/provider";
import { mdiAccountCircle } from "@mdi/js";
import clsx from "clsx";
import { Component, createMemo, createEffect, onCleanup, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Tooltip, Icon } from "#components/primitives";
import { useAuthenticatedUserData } from "#context";

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
    const users = [...(awareness?.getStates().entries() || [])].map(([awarenessId, state]) => {
      return {
        awarenessId,
        ...state.user
      };
    }) as UserAwarenessData[];

    setState("users", users);
    awareness?.on("change", updateUserList);
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

export { UserList };
