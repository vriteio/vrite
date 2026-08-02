import { DropdownMenu, IconButton, MenuItem, createRef } from "@andesine/components";
import { TreeItem, useTree } from "#web/components/tree";
import { useClipboard } from "#web/context/clipboard";
import { useWorkspace } from "#web/context/workspace";
import { Entry } from "#web/lib/client";
import clsx from "clsx";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  on,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import {
  draggable,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { canOrderEntries, createDragData } from "./explorer-dnd";

interface ExplorerEntryProps {
  entry: Entry;
  topLevel?: boolean;
  onParentDragHighlightChange?(highlighted: boolean): void;
}

const ExplorerEntry: Component<ExplorerEntryProps> = (props) => {
  const params = useParams();
  const { copyText } = useClipboard();
  const navigate = useNavigate();
  const { workspaceID, content } = useWorkspace();
  const [{ isSelected, selection, flattenedOrder }, { setRenaming, setSelection }] = useTree();
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [closestEdge, setClosestEdge] = createSignal<Edge | null>(null);
  const [menuOpened, setMenuOpened] = createSignal(false);
  const getCollectionParentID = (collectionID: string) => {
    const collection = content.getCollection(collectionID);

    return collection?.ancestors.at(-1) ?? null;
  };
  const getSiblingCollectionIDs = (parentID: string | null) => {
    return content
      .getContentTreeLevel(parentID)
      .collections()
      .map((collection) => collection.id);
  };
  const changesEntryParent = (source: { data: Record<string | symbol, unknown> }) => {
    const entryIDs =
      source.data.type === "entry"
        ? [source.data.id as string]
        : source.data.type === "multi"
          ? ((source.data.entries as string[] | undefined) ?? [])
          : [];

    return entryIDs.some((entryID) => {
      return (
        (content.getEntry(entryID)?.collectionID ?? null) !== (props.entry.collectionID ?? null)
      );
    });
  };
  const setDropLine = (
    source: { data: Record<string | symbol, unknown> },
    data: Record<string | symbol, unknown>
  ) => {
    const edge = canOrderEntries(source.data) ? extractClosestEdge(data) : null;

    setClosestEdge(edge);
    props.onParentDragHighlightChange?.(Boolean(edge) && changesEntryParent(source));
  };
  const clearDropLine = () => {
    setClosestEdge(null);
    props.onParentDragHighlightChange?.(false);
  };
  const dropdownOptions = createMemo(() => {
    const dropdownOptions: Array<MenuItem[]> = [];
    const selectedCount = selection().length;
    const isMulti = selectedCount > 1;

    if (!isMulti) {
      dropdownOptions.push([
        {
          label: "Copy ID",
          icon: "i-lucide:copy",
          shortcut: "$mod+alt+c",
          onClick: () => {
            void copyText(props.entry.id, {
              success: "ID copied to clipboard",
              fallback: { title: "Copy ID manually" }
            });
          }
        },
        {
          label: "Rename entry",
          icon: "i-lucide:pencil",
          onClick: () => {
            if (content.readOnly()) return;

            setRenaming(props.entry.id);
          },
          shortcut: "f2"
        }
      ]);
    }

    dropdownOptions.push([
      {
        label: isMulti ? `Delete ${selectedCount} items` : "Delete",
        icon: "i-lucide:trash",
        onClick: () => {
          const ids = isMulti ? selection() : [props.entry.id];

          if (content.readOnly()) return;

          content.deleteContent(ids);
          setSelection([]);
        },
        color: "danger",
        shortcut: "$mod+backspace"
      }
    ]);

    return dropdownOptions;
  });

  createEffect(
    on(menuOpened, (opened) => {
      if (!opened) return;

      setSelection((selection) => {
        return selection.includes(props.entry.id) ? selection : [props.entry.id];
      });
    })
  );
  onMount(() => {
    const element = elementRef();

    if (!element) return;

    const cleanup = combine(
      draggable({
        element,
        getInitialData: () => {
          const sel = selection();
          const isDraggingSelected = sel.includes(props.entry.id);

          if (isDraggingSelected && sel.length > 1) {
            return createDragData({
              draggedID: props.entry.id,
              draggedType: "entry",
              selection: sel,
              splitContentIDs: content.splitContentIDs,
              flattenedOrder: flattenedOrder(),
              isCollection: (id) => Boolean(content.getCollection(id)),
              getCollectionParentID,
              getSiblingCollectionIDs
            });
          }

          if (!isDraggingSelected && sel.length > 0) {
            setSelection([]);
          }

          return { type: "entry", id: props.entry.id };
        },
        onGenerateDragPreview({ nativeSetDragImage }) {
          const sel = selection();
          const count = sel.includes(props.entry.id) && sel.length > 1 ? sel.length : 1;

          setCustomNativeDragPreview({
            nativeSetDragImage,
            render({ container }) {
              const el = document.createElement("div");

              el.style.cssText =
                "padding:4px 10px;background:#333;color:#fff;border-radius:6px;font-size:13px;white-space:nowrap";
              el.textContent = count > 1 ? `${count} items` : props.entry.name || "Untitled";
              container.appendChild(el);

              return () => {
                container.removeChild(el);
              };
            }
          });
        }
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => !content.readOnly() && canOrderEntries(source.data),
        getData: ({ input }) => {
          return attachClosestEdge(
            {
              type: "entry",
              id: props.entry.id,
              collectionID: props.entry.collectionID
            },
            {
              element,
              input,
              allowedEdges: ["top", "bottom"]
            }
          );
        },
        onDragEnter: ({ source, self }) => {
          setDropLine(source, self.data);
        },
        onDrag: ({ source, self }) => {
          setDropLine(source, self.data);
        },
        onDragLeave: () => {
          clearDropLine();
        },
        onDrop: () => {
          clearDropLine();
        }
      })
    );

    onCleanup(() => {
      cleanup();
    });
  });

  const handleClick = () => {
    navigate(`/${workspaceID()}/${props.entry.id}`);
  };

  return (
    <div class="flex relative min-h-7">
      <div class="flex relative w-full" data-entry={props.entry.id}>
        <TreeItem
          id={props.entry.id}
          label={props.entry.name}
          topLevel={props.topLevel}
          icon={
            <div
              class={clsx(
                "h-full w-full text-gray-400 dark:text-gray-500 i-lucide:file-text",
                isSelected(props.entry.id) && "bg-gradient-to-tr"
              )}
            />
          }
          selectable
          ref={setElementRef}
          onClick={handleClick}
          onRename={(name) => {
            if (content.readOnly()) return;

            content.updateEntry(props.entry.id, { name });
          }}
          actions={
            <>
              <DropdownMenu
                cardProps={{
                  class: "w-48"
                }}
                opened={menuOpened()}
                portal={false}
                setOpened={setMenuOpened}
                onClick={(event) => event.stopPropagation()}
                trigger={() => (
                  <Show when={selection().length <= 1} fallback={<div />}>
                    <div
                      class={clsx(
                        "",
                        props.entry.id === params.slug
                          ? !menuOpened() && "opacity-0 group-hover:opacity-100"
                          : !menuOpened() && "hidden group-hover:flex"
                      )}
                    >
                      <IconButton
                        icon="i-lucide:ellipsis-vertical"
                        size="small"
                        variant="text"
                        text="soft"
                      />
                    </div>
                  </Show>
                )}
                items={dropdownOptions()}
              />
              <Show when={props.entry.id === params.slug && !menuOpened()}>
                <div
                  class={clsx(
                    "flex justify-center items-center h-7 w-7 absolute right-0 top-0",
                    selection().length <= 1 && "group-hover:hidden"
                  )}
                >
                  <div class="i-lucide:pencil bg-gradient-to-tr h-4 w-4 from-secondary via-primary to-secondary" />
                </div>
              </Show>
            </>
          }
        />
      </div>
      <Show when={closestEdge()}>
        <div
          class={clsx(
            "flex bg-gradient-to-tr h-2.5px w-full absolute items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary z-10",
            closestEdge() === "top" ? "-top-[1.25px]" : "-bottom-[1.25px]"
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

export { ExplorerEntry };
