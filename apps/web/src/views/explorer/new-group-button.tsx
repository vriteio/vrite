import { useExplorerData } from "./explorer-context";
import { mdiFolderPlusOutline } from "@mdi/js";
import clsx from "clsx";
import { Component, createSignal, Show } from "solid-js";
import { useNotifications, useClient } from "#context";
import { Icon, Loader } from "#components/primitives";

const NewGroupButton: Component = () => {
  const { setRenaming } = useExplorerData();
  const { notify } = useNotifications();
  const client = useClient();
  const [loading, setLoading] = createSignal(false);

  return (
    <button
      class="flex w-[calc(100%-1.625rem)] justify-center items-center cursor-pointer overflow-x-hidden group pl-0.5 rounded-l-md @hover:bg-gray-200 dark:@hover-bg-gray-700 ml-6.5"
      onClick={async () => {
        try {
          setLoading(true);

          const contentGroup = await client.contentGroups.create.mutate({
            name: ""
          });

          setRenaming(contentGroup.id);
          setLoading(false);
          notify({ text: "New content group created", type: "success" });
        } catch (error) {
          setLoading(false);
          notify({ text: "Couldn't create new content group", type: "error" });
        }
      }}
    >
      <div class="flex flex-1 justify-start items-center overflow-hidden rounded-lg cursor-pointer h-7 group draggable">
        <div class="flex flex-1" onClick={() => {}}>
          <div class="h-6 w-6 mr-1">
            <Show
              when={loading()}
              fallback={
                <Icon
                  class={clsx("text-gray-500 dark:text-gray-400")}
                  path={mdiFolderPlusOutline}
                />
              }
            >
              <Loader class="h-full fill-current p-0.5" />
            </Show>
          </div>
          <span
            class={clsx(
              "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none clamp-1"
            )}
            title="New group"
          >
            New group
          </span>
        </div>
      </div>
    </button>
  );
};

export { NewGroupButton };
