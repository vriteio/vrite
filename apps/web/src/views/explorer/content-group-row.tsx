import { Component } from "solid-js";
import { mdiChevronRight, mdiFolder, mdiFolderOpen } from "@mdi/js";
import clsx from "clsx";
import SortableLib from "sortablejs";
import { Icon, IconButton } from "#components/primitives";
import { App, hasPermission, useSharedState } from "#context";

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
  const createSharedSignal = useSharedState();
  const [activeDraggablePiece] = createSharedSignal("activeDraggablePiece", null);
  const [activeDraggableGroup, setActiveDraggableGroup] = createSharedSignal(
    "activeDraggableGroup",
    null
  );

  return (
    <div
      class="flex flex-1 justify-center items-center cursor-pointer overflow-x-hidden group ml-1"
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
          "flex flex-1 justify-start items-center overflow-hidden rounded-lg cursor-pointer h-7",
          props.draggable !== false && "draggable"
        )}
        data-content-group-id={props.contentGroup?.id || ""}
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
              (props.highlight ||
                (props.active && !activeDraggableGroup() && !activeDraggablePiece())) &&
                "fill-[url(#gradient)]"
            )}
            path={props.opened ? mdiFolderOpen : mdiFolder}
          />
          <span
            class={clsx(
              "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none clamp-1",
              (props.highlight ||
                (props.active && !activeDraggableGroup() && !activeDraggablePiece())) &&
                "text-transparent bg-clip-text bg-gradient-to-tr"
            )}
            title={props.customLabel || props.contentGroup?.name || ""}
          >
            {props.customLabel || props.contentGroup?.name || ""}
          </span>
        </button>
      </div>
    </div>
  );
};

export { ContentGroupRow };
