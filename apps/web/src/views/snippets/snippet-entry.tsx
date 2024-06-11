import { useSnippetsMenuData } from "./snippets-context";
import { Component, For, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import { mdiCheck, mdiDotsVertical, mdiFileHidden, mdiRename, mdiTrashCan } from "@mdi/js";
import clsx from "clsx";
import { Dropdown, Icon, IconButton, Input, Loader } from "#components/primitives";
import { App, hasPermission, useClient, useConfirmationModal, useNotifications } from "#context";
import { useSnippetsData } from "#context/snippets";

interface SnippetEntryProps {
  snippet: App.Snippet;
  onClick?(): void;
}

const SnippetEntry: Component<SnippetEntryProps> = (props) => {
  const { renaming, loading, setRenaming, setLoading } = useSnippetsMenuData();
  const { activeSnippetId, snippetsActions } = useSnippetsData();
  const { confirmDelete } = useConfirmationModal();
  const { notify } = useNotifications();
  const client = useClient();
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    } | null> = [];

    if (hasPermission("editSnippets")) {
      menuOptions.push(
        {
          icon: mdiRename,
          label: "Rename snippet",
          class: "justify-start",
          onClick() {
            setDropdownOpened(false);
            setRenaming(props.snippet.id);
          }
        },
        {
          icon: mdiTrashCan,
          label: "Delete",
          class: "justify-start",
          color: "danger",
          onClick() {
            setDropdownOpened(false);
            confirmDelete({
              header: "Delete group",
              content: <p>Do you really want to delete this snippet?</p>,
              async onConfirm() {
                if (!props.snippet) return;

                try {
                  setLoading(props.snippet.id);
                  await client.snippets.delete.mutate({ id: props.snippet.id });
                  snippetsActions.deleteSnippet({ id: props.snippet.id });
                  setLoading("");
                  notify({ text: "Snippet deleted", type: "success" });
                } catch (error) {
                  notify({ text: "Couldn't delete the snippet", type: "error" });
                  setLoading("");
                }
              }
            });
          }
        }
      );
    }

    return menuOptions;
  });
  const active = (): boolean => activeSnippetId() === props.snippet.id;

  return (
    <div
      class={clsx(
        "flex justify-center items-center cursor-pointer overflow-hidden ml-2 pl-1 group rounded-l-md",
        !dropdownOpened() && !active() && "@hover-bg-gray-200 dark:@hover-bg-gray-700"
      )}
    >
      <button
        class="flex-1 flex justify-start items-center h-7"
        data-snippet-id={props.snippet.id}
        onClick={() => {
          if (renaming()) return;

          props.onClick?.();
        }}
      >
        <Icon
          class={clsx(
            "h-6 min-w-6 mr-1 text-gray-500 dark:text-gray-400",
            active() && "fill-[url(#gradient)]"
          )}
          path={mdiFileHidden}
        />
        <Show
          when={renaming() !== props.snippet.id}
          fallback={
            <Input
              wrapperClass="flex-1"
              class="m-0 p-0 !bg-transparent h-6 rounded-none pointer-events-auto"
              value={props.snippet.name}
              ref={(el) => {
                setTimeout(() => {
                  el?.select();
                }, 0);
              }}
              onEnter={(event) => {
                const target = event.currentTarget as HTMLInputElement;
                const name = target.value || "";

                client.snippets.update.mutate({
                  id: props.snippet.id,
                  name
                });
                snippetsActions.updateSnippet({ ...props.snippet, name });
                setRenaming("");
              }}
              onChange={(event) => {
                const name = event.currentTarget.value || "";

                client.snippets.update.mutate({
                  id: props.snippet.id,
                  name
                });
                snippetsActions.updateSnippet({ ...props.snippet, name });
                setRenaming("");
              }}
            />
          }
        >
          <span
            class={clsx(
              "clamp-1 text-start",
              active() && "text-transparent bg-clip-text bg-gradient-to-tr"
            )}
          >
            {props.snippet.name}
          </span>
        </Show>
      </button>
      <Switch>
        <Match when={loading() === props.snippet.id}>
          <div class="m-0 p-1 mr-4 ml-1 flex justify-center items-center">
            <Loader class="h-4 w-4" />
          </div>
        </Match>
        <Match when={renaming() === props.snippet.id}>
          <IconButton
            path={mdiCheck}
            class="m-0 p-0 mr-4 ml-1"
            variant="text"
            color="contrast"
            text="soft"
            onClick={() => {
              setRenaming("");
            }}
          />
        </Match>
        <Match when={true}>
          <Dropdown
            placement="bottom-end"
            class="ml-1 mr-4"
            opened={dropdownOpened()}
            setOpened={setDropdownOpened}
            fixed
            activatorButton={() => (
              <IconButton
                path={mdiDotsVertical}
                class={clsx("m-0 p-0 group-hover:opacity-100", !dropdownOpened() && "opacity-0")}
                variant="text"
                color="contrast"
                text="soft"
                onClick={(event) => {
                  event.stopPropagation();
                  setDropdownOpened(true);
                }}
              />
            )}
          >
            <div class="w-full flex flex-col">
              <For each={menuOptions()}>
                {(item) => {
                  if (!item) {
                    return (
                      <div class="hidden md:block w-full h-2px my-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    );
                  }

                  return (
                    <IconButton
                      path={item.icon}
                      label={item.label}
                      variant="text"
                      text="soft"
                      color={item.color}
                      class={clsx("justify-start whitespace-nowrap w-full m-0", item.class)}
                      onClick={item.onClick}
                    />
                  );
                }}
              </For>
            </div>
          </Dropdown>
        </Match>
      </Switch>
    </div>
  );
};

export { SnippetEntry };
