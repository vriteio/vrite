import { DropdownArea, DropdownMenu, IconButton, MenuItem, createRef } from "@andesine/components";
import { TreeItem, TreeLevel, TreeMap, useTree } from "#web/components/tree";
import clsx from "clsx";
import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { Collection } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { ExplorerEntry } from "./explorer-entry";
import {
  draggable,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { useWorkspace } from "#web/context/workspace";

interface ExplorerCollectionProps {
  collection: Collection;
  topLevel?: boolean;
}

const ExplorerCollection: Component<ExplorerCollectionProps> = (props) => {
  const notify = useNotify();
  const [
    { isSelected, isExpanded, selection },
    { setRenaming, toggleExpanded, setExpanded, setSelection }
  ] = useTree();
  const { content } = useWorkspace();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = createSignal(false);
  let expandTimeout: ReturnType<typeof setTimeout> | undefined;

  const { collections, entries } = content.getContentTreeLevel(props.collection.id);
  const dropdownOptions = createMemo(() => {
    const opts: Array<MenuItem[]> = [];
    const selectedCount = selection().length;
    const isMulti = selectedCount > 1;

    if (!isMulti) {
      opts.push([
        {
          label: "Copy ID",
          icon: "i-lucide:copy",
          onClick: () => {
            navigator.clipboard.writeText(props.collection.id);
            notify({
              text: "ID copied to clipboard",
              type: "success"
            });
          }
        },
        {
          label: "Rename group",
          icon: "i-lucide:pencil",
          onClick: () => {
            setRenaming(props.collection.id);
          },
          shortcut: "enter"
        }
      ]);
      opts.push([
        {
          label: "New piece",
          icon: "i-material-symbols:create-new-folder-outline-rounded",
          onClick: () => {
            content.createEntry(props.collection.id);
            setExpanded((prev) => {
              return prev.includes(props.collection.id) ? prev : [...prev, props.collection.id];
            });
          },
          shortcut: "$mod+n"
        },
        {
          label: "New group",
          icon: "i-lucide:file-plus-2",
          onClick: () => {
            content.createCollection(props.collection.id);
            setExpanded((prev) => {
              return prev.includes(props.collection.id) ? prev : [...prev, props.collection.id];
            });
          },
          shortcut: "$mod+shift+n"
        }
      ]);
    }

    opts.push([
      {
        label: isMulti ? `Delete ${selectedCount} items` : "Delete",
        icon: "i-lucide:trash",
        color: "danger",
        onClick: () => {
          const selectedIDs = selection();

          // TODO: deleteCollections(collectionIDs);
          // TODO: deleteEntries(entryIDs);
          setSelection([]);
        }
      }
    ]);

    return opts;
  });
  const treeMap = createMemo<TreeMap>(() => {
    return {
      [props.collection.id]: {
        items: entries().map((entry) => entry.id),
        levels: collections().map((col) => col.id)
      }
    };
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selection) => {
        return selection.includes(props.collection.id) ? selection : [props.collection.id];
      });
    }
  });

  onMount(() => {
    const element = elementRef();

    if (!element) return;

    const cleanup = combine(
      draggable({
        element,
        getInitialData: () => {
          const sel = selection();
          const isDraggingSelected = sel.includes(props.collection.id);

          if (isDraggingSelected && sel.length > 1) {
            return {
              type: "multi",
              ids: sel,
              entries: [], // TODO: sel.filter((id) => !colMap[id]),
              collections: [] // TODO: sel.filter((id) => colMap[id])
            };
          }

          return { type: "collection", id: props.collection.id };
        },
        onGenerateDragPreview({ nativeSetDragImage }) {
          const sel = selection();
          const count = sel.includes(props.collection.id) && sel.length > 1 ? sel.length : 1;

          setCustomNativeDragPreview({
            nativeSetDragImage,
            render({ container }) {
              const el = document.createElement("div");

              el.style.cssText =
                "padding:4px 10px;background:#333;color:#fff;border-radius:6px;font-size:13px;white-space:nowrap";
              el.textContent = count > 1 ? `${count} items` : props.collection.name || "Untitled";
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
        getData: () => ({ type: "collection", id: props.collection.id }),
        canDrop: ({ source }) => {
          const ids: string[] =
            source.data.type === "multi"
              ? (source.data.ids as string[])
              : [source.data.id as string];

          return !ids.includes(props.collection.id);
        },
        onDragEnter: () => {
          setIsDraggedOver(true);
          if (!isExpanded(props.collection.id)) {
            expandTimeout = setTimeout(() => {
              setExpanded((prev) => [...prev, props.collection.id]);
              setIsDraggedOver(false);
            }, 2000);
          }
        },
        onDragLeave: () => {
          setIsDraggedOver(false);
          clearTimeout(expandTimeout);
        },
        onDrop: () => {
          setIsDraggedOver(false);
          clearTimeout(expandTimeout);
        }
      })
    );

    onCleanup(() => {
      cleanup();
    });
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.collection.id}
        label={props.collection.name}
        topLevel={props.topLevel}
        highlighted={isDraggedOver()}
        ref={setElementRef}
        dataAttributes={{ collection: props.collection.id }}
        onClick={() => {
          toggleExpanded(props.collection.id);
        }}
        onRename={(name) => {
          content.updateCollection(props.collection.id, { name });
        }}
        icon={
          <div class="relative flex justify-center items-center">
            <div
              data-element="collection-icon"
              class={clsx(
                "h-6 w-6 text-gray-400 dark:text-gray-500 transition-transform",
                (isSelected(props.collection.id) || isDraggedOver()) && "bg-gradient-to-tr",
                isExpanded(props.collection.id)
                  ? "i-material-symbols:folder-open-rounded"
                  : "i-material-symbols:folder-rounded"
              )}
            />
          </div>
        }
        actions={
          <DropdownMenu
            cardProps={{
              class: "w-48"
            }}
            opened={menuOpened()}
            setOpened={setMenuOpened}
            trigger={() => (
              <IconButton
                class={clsx(!menuOpened() && "opacity-0 group-hover:opacity-100")}
                icon="i-lucide:ellipsis-vertical"
                size="small"
                variant="text"
                text="soft"
              />
            )}
            items={dropdownOptions()}
          />
        }
      />
      <TreeLevel
        levelID={props.collection.id}
        tree={treeMap}
        emptyMessage="Collection empty"
        renderLevel={(id) => {
          const collection = () => content.getCollection(id);

          return (
            <Show when={collection()}>
              <ExplorerCollection collection={collection()!} />
            </Show>
          );
        }}
        renderItem={(entryID) => {
          const entry = () => content.getEntry(entryID);

          return (
            <Show when={entry()}>
              <DropdownArea>
                <ExplorerEntry entry={entry()!} />
              </DropdownArea>
            </Show>
          );
        }}
      />
    </DropdownArea>
  );
};

export { ExplorerCollection };
