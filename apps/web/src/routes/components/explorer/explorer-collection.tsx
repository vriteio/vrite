import { DropdownMenu, IconButton, Input, MenuOption } from "#web/components/primitives";
import { useContent, useNotify } from "#web/context";
import { Entry } from "#web/lib/client";
import { createRef } from "@andesine/components/ref";
import {
  draggable,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import clsx from "clsx";
import { Component, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { useExplorer } from "./explorer-context";
import { useNavigate, useParams } from "@solidjs/router";

interface ExplorerCollectionProps {
  collection: Collection;
  topLevel?: boolean;
}

const ExplorerCollection: Component<ExplorerCollectionProps> = (props) => {
  const params = useParams();
  const notify = useNotify();
  const navigate = useNavigate();
  const [
    { isRenaming, isSelected, selection },
    { setRenaming, setSelection, registerBoundingBox }
  ] = useExplorer();
  const [{ contentTree }, { updateEntry, deleteEntries }] = useContent();
  const [currentName, setCurrentName] = createSignal("");
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [state, setState] = createSignal<{
    type: "idle" | "dragging" | "preview" | "dragging-over";
    closestEdge?: Edge;
    container?: HTMLElement;
  }>({ type: "idle" });
  const dropdownOptions = createMemo(() => {
    const dropdownOptions: Array<MenuOption[]> = [];

    if (selection().length <= 1) {
      dropdownOptions.push([
        {
          label: "Copy ID",
          icon: "i-lucide:copy",
          onClick: () => {
            navigator.clipboard.writeText(props.entry.id);
            notify({
              text: "ID copied to clipboard",
              type: "success"
            });
          }
        },
        {
          label: "Rename entry",
          icon: "i-lucide:pencil",
          onClick: () => {
            setCurrentName(props.entry.name);
            setRenaming(props.entry.id);
          },
          shortcut: "enter"
        }
      ]);
    }

    dropdownOptions.push([
      {
        label: "Delete",
        icon: "i-lucide:trash",
        onClick: () => {
          deleteEntries(selection().length > 0 ? selection() : [props.entry.id]);
          setSelection([]);
        },
        color: "danger",
        shortcut: "$mod+backspace"
      }
    ]);

    return dropdownOptions;
  });

  onMount(() => {
    const element = elementRef();

    if (!element) return;

    const boundingBox = element.getBoundingClientRect();
    const unregisterDraggable = draggable({
      element,
      canDrag() {
        return !isRenaming(props.entry.id);
      },
      getInitialData() {
        return { id: props.entry.id, name: props.entry.name };
      },
      onGenerateDragPreview({ nativeSetDragImage }) {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render({ container }) {
            setState({ type: "preview", container });
          }
        });
      },
      onDragStart() {
        setState({ type: "dragging" });
      },
      onDrop() {
        setState({ type: "idle" });
      }
    });
    const unregisterDropTarget = dropTargetForElements({
      element,
      canDrop({ source }) {
        if (source.element === element) {
          return false;
        }

        return true;
      },
      getData({ input }) {
        return attachClosestEdge(
          { id: props.entry.id, name: props.entry.name },
          {
            element,
            input,
            allowedEdges: ["top", "bottom"]
          }
        );
      },
      getIsSticky() {
        return true;
      },
      onDragEnter({ self }) {
        const closestEdge = extractClosestEdge(self.data);
        if (closestEdge) {
          setState({ type: "dragging-over", closestEdge });
        }
      },
      onDrag({ self }) {
        const closestEdge = extractClosestEdge(self.data)!;

        setState((state) => {
          if (state.type === "dragging-over" && state.closestEdge === closestEdge) {
            return state;
          }

          return { type: "dragging-over", closestEdge };
        });
      },
      onDragLeave() {
        setState({ type: "idle" });
      },
      onDrop() {
        setState({ type: "idle" });
      }
    });
    const unregisterBoundingBox = registerBoundingBox(props.entry.id, boundingBox);

    onCleanup(() => {
      unregisterDraggable();
      unregisterDropTarget();
      unregisterBoundingBox();
    });
  });

  return (
    <div class="flex relative">
      <div
        class="flex relative w-full"
        data-entry={props.entry.id}
        onClick={(event) => {
          if (
            (event.target instanceof HTMLElement &&
              event.target.getAttribute("data-element") === "entry-icon") ||
            event.metaKey ||
            event.shiftKey
          ) {
            if (isSelected(props.entry.id) && !event.metaKey && !event.shiftKey) {
              navigate(`/${props.entry.id}`);
              setSelection([]);
              return;
            }

            setSelection((selection) => {
              if (event.shiftKey) {
                if (selection.length === 0) {
                  return [props.entry.id];
                } else {
                  const index = contentTree["*"].entries.indexOf(props.entry.id);
                  const selectionStartIndex = contentTree["*"].entries.findIndex((id) => {
                    return selection.includes(id);
                  });
                  const selectionEndIndex = contentTree["*"].entries.findLastIndex((id) => {
                    return selection.includes(id);
                  });

                  if (index < selectionStartIndex) {
                    return contentTree["*"].entries.slice(index, selectionEndIndex + 1);
                  } else {
                    return contentTree["*"].entries.slice(selectionEndIndex, index + 1);
                  }
                }
              } else if (event.metaKey) {
                if (selection.includes(props.entry.id)) {
                  return selection.filter((id) => id !== props.entry.id);
                }

                return [...selection, props.entry.id];
              }

              return [props.entry.id];
            });
          } else {
            navigate(`/${props.entry.id}`);
          }
        }}
      >
        <div
          class={clsx(
            "flex flex-1 gap-1 font-medium items-center pl-1 rounded-r-lg group hover:cursor-pointer",
            !isSelected(props.entry.id) &&
              "from-gray-500/10 to-transparent @hover:bg-gradient-to-r",
            props.topLevel && "rounded-l-lg"
          )}
          ref={setElementRef}
        >
          <Show when={!props.topLevel}>
            <div class="w-3" />
          </Show>
          <div
            class={clsx(
              "h-6 w-6 text-gray-400 dark:text-gray-500 i-lucide:file-text",
              isSelected(props.entry.id) && "bg-gradient-to-tr"
            )}
            data-element="entry-icon"
          />
          <Show
            when={!isRenaming(props.entry.id)}
            fallback={
              <Input
                class="p-0 h-unset bg-transparent rounded-none focus:shadow-none"
                ref={(el) => {
                  setTimeout(() => {
                    el?.select();
                  }, 0);
                }}
                value={currentName()}
                setValue={(value) => {
                  setCurrentName(value);
                }}
                onBlur={async () => {
                  updateEntry(props.entry.id, { name: currentName() });
                  setRenaming("");
                }}
                onEnter={async (event) => {
                  updateEntry(props.entry.id, { name: currentName() });
                  setRenaming("");
                  event.preventDefault();
                  event.stopPropagation();
                }}
              />
            }
          >
            <span class="flex-1 line-clamp-1" title={props.entry.name} data-element="entry-name">
              {props.entry.name}
            </span>
            <Show when={props.entry.id === params.slug}>
              <div class="i-lucide:pencil bg-gradient-to-tr h-4 w-4 from-secondary via-primary to-secondary" />
            </Show>
          </Show>
          <DropdownMenu
            cardProps={{
              class: "w-48"
            }}
            activatorButton={() => (
              <div
                class={clsx("opacity-0", !isSelected(props.entry.id) && "group-hover:opacity-100")}
              >
                <IconButton
                  icon="i-lucide:ellipsis-vertical"
                  size="small"
                  variant="text"
                  text="soft"
                />
              </div>
            )}
            options={dropdownOptions()}
          />
        </div>
        <Show when={state().type === "preview"}>
          <Portal mount={state().container}>
            <div class="flex gap-1 pr-2 pl-1 py-0.5 rounded-lg bg-gray-100">
              <div class={clsx("i-lucide:file-text h-6 w-6 text-gray-500 dark:text-gray-400")} />
              <span class="flex-1">{props.entry.name}</span>
            </div>
          </Portal>
        </Show>
      </div>
      <Show when={state().type === "dragging-over" && state().closestEdge}>
        <div
          class={clsx(
            "flex bg-gradient-to-tr h-2.5px w-full absolute items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary",
            state().closestEdge === "top" && "-top-[1.25px]",
            state().closestEdge === "bottom" && "-bottom-[1.25px]"
          )}
        >
          <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
            <div class="h-1 w-1 bg-gray-100 rounded-full" />
          </div>
        </div>
      </Show>
    </div>
  );
};

export { ExplorerCollection };
