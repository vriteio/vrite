import { useContentGroupsContext } from "../../content-groups-context";
import { Component, For, Show, createMemo, createSignal } from "solid-js";
import {
  mdiDotsVertical,
  mdiFileLock,
  mdiFileLockOpen,
  mdiFolder,
  mdiFolderLock,
  mdiFolderOpen,
  mdiIdentifier,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import SortableLib from "sortablejs";
import { Card, Dropdown, IconButton } from "#components/primitives";
import {
  App,
  hasPermission,
  useClient,
  useConfirmationModal,
  useNotifications,
  useSharedState
} from "#context";
import { MiniEditor } from "#components/fragments";

interface ContentGroupRowProps {
  contentGroup?: App.ContentGroup | null;
  customLabel?: string;
  menuDisabled?: boolean;
  draggable?: boolean;
  removeContentGroup(id: string): void;
  removeContentPiece(id: string): void;
}

declare module "#context" {
  interface SharedState {
    activeDraggableGroup: App.ContentGroup | null;
  }
}

const ContentGroupRow: Component<ContentGroupRowProps> = (props) => {
  const client = useClient();
  const createSharedSignal = useSharedState();
  const { notify } = useNotifications();
  const { confirmDelete } = useConfirmationModal();
  const { setAncestor } = useContentGroupsContext();
  const [activeDraggableGroup, setActiveDraggableGroup] = createSharedSignal(
    "activeDraggableGroup",
    null
  );
  const [activeDraggablePiece, setActiveDraggablePiece] = createSharedSignal(
    "activeDraggablePiece",
    null
  );
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const [highlight, setHighlight] = createSignal(false);
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    }> = [
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
      menuOptions.push({
        icon: props.contentGroup?.locked ? mdiFileLockOpen : mdiFileLock,
        label: props.contentGroup?.locked ? "Unlock" : "Lock",
        async onClick() {
          if (!props.contentGroup) return;

          await client.contentGroups.update.mutate({
            id: props.contentGroup.id,
            locked: !props.contentGroup.locked
          });
          setDropdownOpened(false);
        }
      });
    }

    if (!props.contentGroup?.locked && hasPermission("manageDashboard")) {
      menuOptions.push({
        icon: mdiTrashCan,
        label: "Delete",
        class: "justify-start",
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
                await client.contentGroups.delete.mutate({ id: props.contentGroup.id });
                notify({ text: "Content group deleted", type: "success" });
              } catch (error) {
                notify({ text: "Couldn't delete the content group", type: "success" });
              }
            }
          });
        }
      });
    }

    return menuOptions;
  });

  return (
    <Card class="m-0 border-x-0 border-t-0 rounded-none flex justify-start items-center hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer pl-4">
      <div
        class="flex flex-1 justify-center items-center cursor-pointer overflow-x-hidden"
        ref={(el) => {
          SortableLib.create(el, {
            group: {
              name: "shared",
              put: (_to, _from, dragEl) => {
                return (
                  Boolean(dragEl.dataset.contentGroupId) &&
                  dragEl.dataset.contentGroupId !== props.contentGroup?.id
                );
              }
            },
            disabled: !hasPermission("manageDashboard"),
            ghostClass: "!hidden",
            revertOnSpill: true,
            filter: ".locked",
            onAdd(evt) {
              const el = evt.item;

              if (el.dataset.contentGroupId) {
                el.remove();
                setHighlight(false);
                client.contentGroups.move.mutate({
                  id: el.dataset.contentGroupId,
                  ancestor: props.contentGroup?.id || null
                });
                props.removeContentGroup(el.dataset.contentGroupId);

                return;
              }

              if (el.dataset.contentPieceId && props.contentGroup) {
                el.remove();
                setHighlight(false);
                client.contentPieces.move.mutate({
                  id: el.dataset.contentPieceId,
                  contentGroupId: props.contentGroup.id
                });
                props.removeContentPiece(el.dataset.contentPieceId);
              }
            },
            onStart() {
              setActiveDraggableGroup(props.contentGroup);
            },
            onEnd() {
              setActiveDraggableGroup(null);
            }
          });
        }}
      >
        <div
          class={clsx(
            "flex flex-1 justify-center items-center overflow-hidden rounded-lg",
            props.draggable === false && "locked"
          )}
          data-content-group-id={props.contentGroup?.id || ""}
          onDragOver={(event) => event.preventDefault()}
          onDragEnter={(event) => {
            if (
              event.relatedTarget instanceof HTMLElement &&
              !event.target.contains(event.relatedTarget)
            ) {
              setHighlight(true);
            }
          }}
          onDragLeave={(event) => {
            if (
              event.relatedTarget instanceof HTMLElement &&
              !event.target.contains(event.relatedTarget)
            ) {
              setHighlight(false);
            }
          }}
          onMouseEnter={() => {
            if (activeDraggableGroup()) {
              setHighlight(true);
            }
          }}
          onMouseLeave={() => {
            if (activeDraggableGroup()) {
              setHighlight(false);
            }
          }}
          onTouchMove={(event) => {
            if (activeDraggableGroup()) {
              const x = event.touches[0].clientX;
              const y = event.touches[0].clientY;
              const elementAtTouchPoint = document.elementFromPoint(x, y);

              if (
                elementAtTouchPoint === event.target ||
                elementAtTouchPoint?.parentNode === event.target
              ) {
                setHighlight(true);
              } else {
                setHighlight(false);
              }
            }
          }}
        >
          <div class="h-8 w-8 relative group mr-1">
            <IconButton
              path={props.contentGroup?.locked ? mdiFolderLock : mdiFolder}
              variant="text"
              class={clsx(
                "m-0 absolute top-0 left-0 group-hover:opacity-0",
                highlight() && "!opacity-0"
              )}
              hover={false}
              onClick={() => {
                setAncestor(props.contentGroup);
              }}
            />
            <IconButton
              path={mdiFolderOpen}
              variant="text"
              class={clsx(
                "m-0 absolute top-0 left-0 opacity-0 group-hover:opacity-100",
                highlight() && "!opacity-100"
              )}
              color={highlight() ? "primary" : "base"}
              onClick={() => {
                setAncestor(props.contentGroup);
              }}
            />
          </div>
          <MiniEditor
            class={clsx(
              "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden hover:cursor-text",
              highlight() && "highlight-text"
            )}
            content="paragraph"
            initialValue={props.customLabel || props.contentGroup?.name || ""}
            readOnly={Boolean(
              props.customLabel ||
                activeDraggableGroup() ||
                activeDraggablePiece() ||
                props.contentGroup?.locked ||
                !hasPermission("manageDashboard")
            )}
            placeholder="Group name"
            onBlur={(editor) => {
              if (!props.contentGroup) return;

              client.contentGroups.update.mutate({
                id: props.contentGroup.id,
                name: editor.getText()
              });
            }}
          />
        </div>
      </div>
      <Show when={!props.menuDisabled}>
        <Dropdown
          placement="bottom-end"
          opened={dropdownOpened()}
          class="ml-1 mr-4"
          setOpened={setDropdownOpened}
          activatorButton={() => (
            <IconButton
              path={mdiDotsVertical}
              class="justify-start m-0 content-group-menu @hover-dark:bg-gray-800"
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
          <div class="w-full gap-1 flex flex-col">
            <For each={menuOptions()}>
              {(item) => {
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
      </Show>
    </Card>
  );
};

export { ContentGroupRow };
