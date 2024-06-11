import { useSnippetsMenuData } from "./snippets-context";
import clsx from "clsx";
import { Component, Show, createSignal } from "solid-js";
import { mdiShapePlus } from "@mdi/js";
import { Icon, Loader } from "#components/primitives";
import { useClient, useNotifications } from "#context";

const NewSnippetButton: Component = () => {
  const { setRenaming } = useSnippetsMenuData();
  const { notify } = useNotifications();
  const client = useClient();
  const [loading, setLoading] = createSignal(false);

  return (
    <button
      class="flex w-full justify-center items-center cursor-pointer overflow-x-hidden group rounded-l-md @hover:bg-gray-200 dark:@hover-bg-gray-700 ml-2 pl-1"
      onClick={async () => {
        try {
          setLoading(true);

          const contentGroup = await client.snippets.create.mutate({
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
                <Icon class={clsx("text-gray-500 dark:text-gray-400")} path={mdiShapePlus} />
              }
            >
              <Loader class="h-full fill-current p-0.5" />
            </Show>
          </div>
          <span
            class={clsx(
              "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none clamp-1"
            )}
            title="New snippet"
          >
            New snippet
          </span>
        </div>
      </div>
    </button>
  );
};

export { NewSnippetButton };
