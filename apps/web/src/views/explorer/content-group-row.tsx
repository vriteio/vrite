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
  contentGroup?: App.ContentGroup | null;
  customLabel?: string;
  menuDisabled?: boolean;
  draggable?: boolean;
  loading?: boolean;
  opened?: boolean;
  active?: boolean;
  removeContentGroup(id: string): void;
  removeContentPiece(id: string): void;
  onClick?(): void;
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
  const [activeDraggableGroup, setActiveDraggableGroup] = createSharedSignal(
    "activeDraggableGroup",
    null
  );
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const [highlight, setHighlight] = createSignal(false);

  window.addEventListener("touchmove", (event) => {
    if (activeDraggableGroup()) {
      const x = event.touches[0].clientX;
      const y = event.touches[0].clientY;
      const elementAtTouchPoint = document.elementFromPoint(x, y);

      if (
        props.contentGroup?.id !== activeDraggableGroup()?.id &&
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
          delayOnTouchOnly: true,
          delay: 500,
          disabled: !hasPermission("manageDashboard"),
          /*  ghostClass: "!hidden",
             dragClass: "!block", */
          /* ghostClass: "!hidden",
             chosenClass: "!hidden",
             selectedClass: "!hidden", */
          revertOnSpill: true,
          draggable: ".draggable",
          fallbackOnBody: true,
          onClone(event) {
            setTimeout(() => {
              const ghost = document.querySelector(".sortable-ghost");

              if (ghost) {
                ghost.classList.add("!hidden");
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
            setActiveDraggableGroup(null);
          }
        });
        setContainerRef(el);
      }}
    >
      <button
        class={clsx(
          "flex flex-1 justify-center items-center overflow-hidden rounded-lg cursor-pointer p-1",
          props.draggable !== false && "draggable"
        )}
        onClick={() => {
          props.onClick?.();
        }}
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
        <Icon
          class={clsx("h-5 w-5 transform transition", props.opened && "rotate-90")}
          path={mdiChevronRight}
        />
        <Icon
          class={clsx(
            "h-5 w-5 mr-1 text-gray-500 dark:text-gray-400",
            (highlight() || (props.active && !highlight())) && "fill-[url(#gradient)]"
          )}
          path={props.opened ? mdiFolderOpen : mdiFolder}
        />
        <span
          class={clsx(
            "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none",
            (highlight() || (props.active && !highlight())) &&
              "text-transparent bg-clip-text bg-gradient-to-tr"
          )}
        >
          {props.customLabel || props.contentGroup?.name || ""}
        </span>
      </button>
    </div>
  );
};

export { ContentGroupRow };
