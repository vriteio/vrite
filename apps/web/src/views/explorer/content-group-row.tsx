import { useContentGroupsContext } from "./content-groups-context";
import { Component, For, Show, createMemo, createSignal } from "solid-js";
import {
  mdiChevronDown,
  mdiChevronRight,
  mdiDotsVertical,
  mdiFileLock,
  mdiFileLockOpen,
  mdiFolder,
  mdiFolderOpen,
  mdiIdentifier,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import SortableLib from "sortablejs";
import { Card, Dropdown, Icon, IconButton, Loader } from "#components/primitives";
import {
  App,
  hasPermission,
  useClient,
  useConfirmationModal,
  useNotifications,
  useSharedState
} from "#context";
import { createRef } from "#lib/utils";

interface ContentGroupRowProps {
  contentGroup: App.ContentGroup;
  customLabel?: string;
  menuDisabled?: boolean;
  draggable?: boolean;
  loading?: boolean;
  opened?: boolean;
  active?: boolean;
  removeContentGroup(id: string): void;
  removeContentPiece(id: string): void;
  onClick?(): void;
  onExpand?(forceOpen?: boolean): void;
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
  const [containerRef, setContainerRef] = createRef<HTMLDivElement | null>(null);
  const [showGhost, setShowGhost] = createRef(() => {});
  const [activeDraggableGroup, setActiveDraggableGroup] = createSharedSignal(
    "activeDraggableGroup",
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
        icon: props.contentGroup.locked ? mdiFileLockOpen : mdiFileLock,
        label: props.contentGroup.locked ? "Unlock" : "Lock",
        async onClick() {
          await client.contentGroups.update.mutate({
            id: props.contentGroup.id,
            locked: !props.contentGroup.locked
          });
          setContentPieces(
            contentPieces().map((contentPiece) => {
              return {
                ...contentPiece,
                locked: !props.contentGroup.locked
              };
            })
          );
          setDropdownOpened(false);
        }
      });
    }

    if (!props.contentGroup.locked && hasPermission("manageDashboard")) {
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
              try {
                await client.contentGroups.delete.mutate({ id: props.contentGroup.id });
                setStorage((storage) => ({
                  ...storage,
                  ...(contentPieces().find((contentPiece) => {
                    return contentPiece.contentGroupId === props.contentGroup.id;
                  }) && { contentPieceId: undefined })
                }));
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

  window.addEventListener("touchmove", (event) => {
    if (activeDraggableGroup()) {
      const x = event.touches[0].clientX;
      const y = event.touches[0].clientY;
      const elementAtTouchPoint = document.elementFromPoint(x, y);

      if (
        props.contentGroup.id !== activeDraggableGroup()?.id &&
        (elementAtTouchPoint === containerRef() || containerRef()?.contains(elementAtTouchPoint))
      ) {
        setHighlight(true);
      } else {
        setHighlight(false);
      }
    }
  });

  return (
    <div
      class="flex flex-1 justify-center items-center cursor-pointer overflow-x-hidden group ml-1"
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
          delayOnTouchOnly: true,
          delay: 500,
          disabled: !hasPermission("manageDashboard"),
          revertOnSpill: true,
          draggable: ".draggable",
          fallbackOnBody: true,
          onClone(event) {
            setTimeout(() => {
              const ghost = document.querySelector(".sortable-ghost");

              if (ghost) {
                ghost.classList.add("!hidden");
                setShowGhost(() => {
                  ghost.classList.remove("!hidden");
                });
              }
            });
          },
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
            showGhost()();
            setActiveDraggableGroup(null);
          }
        });
        setContainerRef(el);
      }}
    >
      <div
        class={clsx(
          "flex flex-1 justify-start items-center overflow-hidden rounded-lg cursor-pointer h-7",
          props.draggable !== false && "draggable"
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
      >
        <IconButton
          class={clsx("transform transition m-0 p-0.25", props.opened && "rotate-90")}
          path={mdiChevronRight}
          variant="text"
          onClick={() => {
            props.onExpand?.();
          }}
        />
        <button
          class="flex flex-1"
          onClick={() => {
            props.onExpand?.(true);
            props.onClick?.();
          }}
        >
          <Icon
            class={clsx(
              "h-6 w-6 mr-1 text-gray-500 dark:text-gray-400",
              (highlight() || (props.active && !activeDraggableGroup())) && "fill-[url(#gradient)]"
            )}
            path={props.opened ? mdiFolderOpen : mdiFolder}
          />
          <span
            class={clsx(
              "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none",
              (highlight() || (props.active && !activeDraggableGroup())) &&
                "text-transparent bg-clip-text bg-gradient-to-tr"
            )}
          >
            {props.customLabel || props.contentGroup?.name || ""}
          </span>
        </button>
        <div class="hidden group-hover:flex">
          <Dropdown
            placement="bottom-end"
            opened={dropdownOpened()}
            fixed
            class="ml-1 mr-3"
            setOpened={setDropdownOpened}
            activatorButton={() => (
              <IconButton path={mdiDotsVertical} class="m-0 p-0.25" text="soft" variant="text" />
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
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        item.onClick();
                      }}
                    />
                  );
                }}
              </For>
            </div>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export { ContentGroupRow };
