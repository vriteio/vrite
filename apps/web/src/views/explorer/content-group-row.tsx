import { useExplorerData } from "./explorer-context";
import { Component, For, Match, Show, Switch, createMemo, createSignal } from "solid-js";
import {
  mdiCheck,
  mdiChevronRight,
  mdiDotsVertical,
  mdiFileDocumentPlusOutline,
  mdiFolder,
  mdiFolderOpen,
  mdiFolderPlus,
  mdiIdentifier,
  mdiRename,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import SortableLib from "sortablejs";
import { useLocation } from "@solidjs/router";
import { Dropdown, Icon, IconButton, Input, Loader } from "#components/primitives";
import {
  App,
  hasPermission,
  useClient,
  useConfirmationModal,
  useNotifications,
  useSharedState
} from "#context";

interface ContentGroupRowProps {
  contentGroup: App.ContentGroup;
  customLabel?: string;
  menuDisabled?: boolean;
  draggable?: boolean;
  loading?: boolean;
  opened?: boolean;
  active?: boolean;
  highlight?: boolean;
  removeContentGroup(id: string): void;
  removeContentPiece(id: string): void;
  onClick?(): void;
  onExpand?(forceOpen?: boolean): void;
  onDragEnd?(event: SortableLib.SortableEvent): void;
}

declare module "#context" {
  interface SharedState {
    activeDraggableGroup: App.ContentGroup | null;
  }
}

const ContentGroupRow: Component<ContentGroupRowProps> = (props) => {
  const { loading, renaming, setLoading, setRenaming } = useExplorerData();
  const createSharedSignal = useSharedState();
  const client = useClient();
  const location = useLocation();
  const { notify } = useNotifications();
  const { confirmDelete } = useConfirmationModal();
  const { setLevels, setContentGroups } = useExplorerData();
  const [activeDraggablePiece] = createSharedSignal("activeDraggablePiece", null);
  const [activeDraggableGroup, setActiveDraggableGroup] = createSharedSignal(
    "activeDraggableGroup",
    null
  );
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    } | null> = [
      {
        icon: mdiIdentifier,
        label: "Copy ID",
        async onClick() {
          if (!props.contentGroup) return;

          await window.navigator.clipboard.writeText(props.contentGroup.id);
          setDropdownOpened(false);
          notify({
            text: "Content group ID copied to the clipboard",
            type: "success"
          });
        }
      }
    ];

    if (hasPermission("manageDashboard")) {
      menuOptions.push(
        {
          icon: mdiRename,
          label: "Rename group",

          onClick() {
            setDropdownOpened(false);
            setRenaming(props.contentGroup.id);
          }
        },
        null,
        {
          icon: mdiFileDocumentPlusOutline,
          label: "New content piece",

          async onClick() {
            setLoading(props.contentGroup.id);

            try {
              const newContentPiece = await client.contentPieces.create.mutate({
                contentGroupId: props.contentGroup.id,
                tags: [],
                members: [],
                title: ""
              });

              setDropdownOpened(false);
              setRenaming(newContentPiece.id);
              setLoading("");
              notify({ text: "Content piece created", type: "success" });
            } catch (error) {
              notify({ text: "Couldn't create the content piece", type: "error" });
              setLoading("");
            }
          }
        },
        {
          icon: mdiFolderPlus,
          label: "New group",

          async onClick() {
            setLoading(props.contentGroup.id);

            try {
              const newContentPiece = await client.contentGroups.create.mutate({
                ancestor: props.contentGroup.id,
                name: ""
              });

              setDropdownOpened(false);
              setRenaming(newContentPiece.id);
              setLoading("");
              notify({ text: "Content group created", type: "success" });
            } catch (error) {
              notify({ text: "Couldn't create the content group", type: "error" });
              setLoading("");
            }
          }
        },
        null,
        {
          icon: mdiTrashCan,
          label: "Delete",

          color: "danger",
          onClick() {
            setDropdownOpened(false);
            confirmDelete({
              header: "Delete group",
              content: (
                <p>
                  Do you really want to delete this content group? This will also delete all pieces
                  related to this group.
                </p>
              ),
              async onConfirm() {
                if (!props.contentGroup) return;

                try {
                  setLoading(props.contentGroup.id);
                  await client.contentGroups.delete.mutate({ id: props.contentGroup.id });
                  setLevels(props.contentGroup.ancestors.at(-1) || "", "groups", (groups) => {
                    return groups.filter((groupId) => groupId !== props.contentGroup?.id);
                  });
                  setContentGroups(props.contentGroup.id, undefined);
                  setLoading("");
                  notify({ text: "Content group deleted", type: "success" });
                } catch (error) {
                  notify({ text: "Couldn't delete the content group", type: "error" });
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

  return (
    <div
      class={clsx(
        "flex flex-1 justify-center items-center cursor-pointer overflow-x-hidden group ml-0.5",
        !dropdownOpened() && !props.active && "@hover:bg-gray-200 dark:@hover-bg-gray-700"
      )}
      ref={(el) => {
        SortableLib.create(el, {
          group: {
            name: "shared",
            pull: false,
            put: false
          },
          delayOnTouchOnly: true,
          delay: 250,
          disabled: !hasPermission("manageDashboard"),
          revertOnSpill: true,
          draggable: ".draggable",
          fallbackOnBody: true,
          sort: false,
          onStart() {
            setActiveDraggableGroup(props.contentGroup);
          },
          onEnd(event) {
            event.preventDefault();
            props.onDragEnd?.(event);
            setActiveDraggableGroup(null);
          }
        });
      }}
    >
      <div
        class={clsx(
          "flex flex-1 justify-start items-center overflow-hidden rounded-lg cursor-pointer h-7 group",
          props.draggable !== false && "draggable"
        )}
        data-content-group-id={props.contentGroup?.id || ""}
      >
        <IconButton
          class={clsx("transform transition m-0 p-0 ml-0.25", props.opened && "rotate-90")}
          path={mdiChevronRight}
          variant="text"
          onClick={() => {
            props.onExpand?.();
          }}
        />
        <button
          class="flex flex-1"
          onClick={() => {
            if (renaming()) return;

            props.onExpand?.(true);
            props.onClick?.();
          }}
        >
          <Icon
            class={clsx(
              "h-6 w-6 mr-1 text-gray-500 dark:text-gray-400",
              (props.highlight ||
                (props.active &&
                  !activeDraggableGroup() &&
                  !activeDraggablePiece() &&
                  location.pathname === "/")) &&
                "fill-[url(#gradient)]"
            )}
            path={props.opened ? mdiFolderOpen : mdiFolder}
          />
          <Show
            when={renaming() !== props.contentGroup.id}
            fallback={
              <Input
                wrapperClass="flex-1"
                class="m-0 p-0 !bg-transparent h-6 rounded-none pointer-events-auto"
                value={props.contentGroup.name}
                ref={(el) => {
                  setTimeout(() => {
                    el?.select();
                  }, 0);
                }}
                onEnter={(event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  const name = target.value || "";

                  client.contentGroups.update.mutate({
                    id: props.contentGroup.id,
                    name
                  });
                  setContentGroups(props.contentGroup.id, { ...props.contentGroup, name });
                  setRenaming("");
                }}
                onChange={(event) => {
                  const name = event.currentTarget.value || "";

                  client.contentGroups.update.mutate({
                    id: props.contentGroup.id,
                    name
                  });
                  setContentGroups(props.contentGroup.id, { ...props.contentGroup, name });
                  setRenaming("");
                }}
              />
            }
          >
            <span
              class={clsx(
                "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none clamp-1",
                (props.highlight ||
                  (props.active &&
                    !activeDraggableGroup() &&
                    !activeDraggablePiece() &&
                    location.pathname === "/")) &&
                  "text-transparent bg-clip-text bg-gradient-to-tr"
              )}
              title={props.customLabel || props.contentGroup?.name || ""}
            >
              {props.customLabel || props.contentGroup?.name || ""}
            </span>
          </Show>
        </button>
        <Switch>
          <Match when={loading() === props.contentGroup.id}>
            <div class="m-0 p-1 mr-4 ml-1 flex justify-center items-center">
              <Loader class="h-4 w-4" />
            </div>
          </Match>
          <Match when={renaming() === props.contentGroup.id}>
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
              opened={dropdownOpened()}
              fixed
              class="ml-1 mr-4"
              setOpened={setDropdownOpened}
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
                        class="justify-start whitespace-nowrap w-full m-0 justify-start"
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
    </div>
  );
};

export { ContentGroupRow };
