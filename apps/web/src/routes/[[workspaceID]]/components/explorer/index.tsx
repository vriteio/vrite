import {
  DropdownArea,
  DropdownMenu,
  IconButton,
  Skeleton,
  Shortcut,
  useShortcuts,
  createRef
} from "@andesine/components";
import { TreeSelection, useTree } from "#web/components/tree";
import { ExplorerProvider } from "./explorer-context";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { ExplorerEntry } from "./explorer-entry";
import { ExplorerCollection } from "./explorer-collection";
import {
  monitorForElements,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useWorkspace } from "#web/context/workspace";

const Explorer = () => {
  const registerShortcuts = useShortcuts();
  const [{ selection, flattenedOrder, itemHeight }, { setSelection, setRenaming }] = useTree();
  const { content } = useWorkspace();
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [treeContainerRef, setTreeContainerRef] = createRef<HTMLElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = createSignal(false);
  const [dropdownMenuOpened, setDropdownMenuOpened] = createSignal(false);
  const [pointerDown, setPointerDown] = createSignal(false);
  const [boxSelection, setBoxSelection] = createSignal({
    active: false,
    x: 0,
    y: 0,
    currentX: 0,
    currentY: 0,
    width: 0,
    height: 0
  });
  const onPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (
      !event.target.matches("[data-explorer-panel] *") ||
      event.target.matches("[data-entry] *, [data-collection] *")
    ) {
      return;
    }
    if (event.button === 0) {
      document.documentElement.style.userSelect = "none";
      setPointerDown(true);
      setBoxSelection({
        active: false,
        x: event.clientX,
        y: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        width: 0,
        height: 0
      });
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointerDown()) return;

    const newBoxSelectionWidth = Math.abs(event.clientX - boxSelection().x);
    const newBoxSelectionHeight = Math.abs(event.clientY - boxSelection().y);
    const activationThreshold = 10;
    const newBoxSelection = {
      ...boxSelection(),
      active:
        boxSelection().active ||
        newBoxSelectionWidth > activationThreshold ||
        newBoxSelectionHeight > activationThreshold,
      currentX: event.clientX,
      currentY: event.clientY,
      width: newBoxSelectionWidth,
      height: newBoxSelectionHeight
    };

    setBoxSelection(newBoxSelection);

    if (!newBoxSelection.active) return;

    const selectedIDs: string[] = [];
    const containerEl = treeContainerRef();

    if (containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const scrollTop = containerEl.scrollTop;
      const selLeft = Math.min(newBoxSelection.x, newBoxSelection.currentX ?? newBoxSelection.x);
      const selRight = Math.max(newBoxSelection.x, newBoxSelection.currentX ?? newBoxSelection.x);
      const selTop = Math.min(newBoxSelection.y, newBoxSelection.currentY ?? newBoxSelection.y);
      const selBottom = Math.max(newBoxSelection.y, newBoxSelection.currentY ?? newBoxSelection.y);

      flattenedOrder().forEach((id, index) => {
        const itemTop = containerRect.top + index * itemHeight - scrollTop;
        const itemBottom = itemTop + itemHeight;

        if (
          containerRect.left < selRight &&
          itemTop < selBottom &&
          containerRect.right > selLeft &&
          itemBottom > selTop
        ) {
          selectedIDs.push(id);
        }
      });
    }

    setSelection((currentSelection) => {
      if (`${selectedIDs}` === `${currentSelection}`) {
        return currentSelection;
      }

      return selectedIDs;
    });
  };
  const onPointerEnd = (event: PointerEvent | MouseEvent) => {
    if (!pointerDown()) return;

    setPointerDown(false);

    if (boxSelection().active) {
      document.documentElement.style.userSelect = "";
      setBoxSelection({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        currentX: 0,
        currentY: 0
      });
    } else if (!event.metaKey && !event.shiftKey && event.type !== "pointerleave") {
      const isContextMenu = event.button === 2;
      const entryID = (event.target as HTMLElement)
        .closest("[data-entry]")
        ?.getAttribute("data-entry");

      if (!entryID || !selection().includes(entryID)) {
        setSelection((selection) => {
          if (entryID && isContextMenu) {
            return [entryID];
          }

          return selection.length >= 1 ? [] : selection;
        });
      }
    }
  };
  const dropdownOptions = [
    {
      label: "New entry",
      icon: "i-lucide:file-plus-2",
      shortcut: "$mod+E",
      onClick: async () => {
        const entry = await content.createEntry();

        setRenaming(entry?.id || "");
      }
    },
    {
      label: "New collection",
      icon: "i-material-symbols:create-new-folder-outline-rounded",
      onClick: async () => {
        const collection = await content.createCollection();

        setRenaming(collection?.id || "");
      },
      shortcut: "$mod+shift+E"
    }
  ];
  const { collections, entries } = content.getContentTreeLevel(null);

  createEffect(() => {
    const unregister = monitorForElements({
      onDrop({ source, location }) {
        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceData = source.data;
        const targetData = target.data;

        // Determine which entries and collections are being moved
        let entryIDs: string[] = [];
        let collectionIDs: string[] = [];

        if (sourceData.type === "multi") {
          entryIDs = sourceData.entries as string[];
          collectionIDs = sourceData.collections as string[];
        } else if (sourceData.type === "entry") {
          entryIDs = [sourceData.id as string];
        } else if (sourceData.type === "collection") {
          collectionIDs = [sourceData.id as string];
        } else {
          return;
        }

        /*if (targetData.type === "entry") {
          const targetEntryID = targetData.id as string;

          // Prevent drop on self
          if (entryIDs.length === 1 && entryIDs[0] === targetEntryID) return;

          const edge = extractClosestEdge(targetData);
          const targetCollectionID = targetData.collectionID as string;

          // For single-entry drag, use edge-based reorder
          if (entryIDs.length === 1 && collectionIDs.length === 0) {
            const targetEntry = entriesMap()[targetEntryID];

            if (targetEntry && edge === "top") {
              moveEntry(entryIDs[0], {
                collectionID: targetCollectionID,
                order: LexoRank.parse(targetEntry.order).genPrev().toString()
              });
            } else if (targetEntry && edge === "bottom") {
              moveEntry(entryIDs[0], {
                collectionID: targetCollectionID,
                order: LexoRank.parse(targetEntry.order).genNext().toString()
              });
            }
          } else {
            // Multi-item: move everything into the same collection as the target entry
            for (const id of entryIDs) {
              if (id !== targetEntryID) {
                const entry = entriesMap()[id];

                if (entry) moveEntry(id, { collectionID: targetCollectionID, order: entry.order });
              }
            }

            for (const id of collectionIDs) {
              moveCollection(id, targetCollectionID || null);
            }
          }
        } else if (targetData.type === "collection") {
          const targetCollectionID = targetData.id as string;

          for (const id of entryIDs) {
            const entry = entriesMap()[id];

            if (entry) moveEntry(id, { collectionID: targetCollectionID, order: entry.order });
          }

          for (const id of collectionIDs) {
            if (id !== targetCollectionID) {
              moveCollection(id, targetCollectionID);
            }
          }
        } else if (targetData.type === "explorer") {
          for (const id of entryIDs) {
            const entry = entriesMap()[id];

            if (entry) moveEntry(id, { collectionID: null, order: entry.order });
          }

          for (const id of collectionIDs) {
            moveCollection(id, null);
          }
        }*/

        setSelection([]);
      }
    });

    onCleanup(unregister);
  });

  createEffect(() => {
    document.body.addEventListener("pointermove", onPointerMove);
    document.body.addEventListener("pointerup", onPointerEnd);
    document.body.addEventListener("pointerleave", onPointerEnd);
    document.body.addEventListener("contextmenu", onPointerEnd);
    const unregisterShortcuts = registerShortcuts({
      "$mod+E": (event) => {
        /*createEntry().then((entry) => {
          setRenaming(entry?.id || "");
        });*/

        return true;
      },
      "$mod+backspace": () => {
        /*if (selection().length > 0) {
          const entryIDs = selection().filter((id) => entriesMap()[id]);
          const collectionIDs = selection().filter((id) => collectionsMap()[id]);

          if (entryIDs.length > 0) deleteEntries(entryIDs);
          if (collectionIDs.length > 0) deleteCollections(collectionIDs);
          setSelection([]);

          return true;
        }*/

        return false;
      },
      "enter": () => {
        if (selection().length === 1) {
          setRenaming(selection()[0]);

          return true;
        }

        return false;
      }
    });

    onCleanup(() => {
      document.body.removeEventListener("pointermove", onPointerMove);
      document.body.removeEventListener("pointerup", onPointerEnd);
      document.body.removeEventListener("pointerleave", onPointerEnd);
      document.body.removeEventListener("contextmenu", onPointerEnd);
      unregisterShortcuts();
    });
  });

  onMount(() => {
    const element = elementRef();
    if (!element) return;

    const cleanup = dropTargetForElements({
      element,
      getData: () => ({ type: "explorer", id: "" }),
      onDragEnter: () => {
        setIsDraggedOver(true);
      },
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: () => setIsDraggedOver(false)
    });

    onCleanup(() => {
      cleanup();
    });
  });

  return (
    <DropdownArea>
      <div
        data-explorer-panel
        class="flex flex-col flex-1 justify-center items-start px-1"
        onPointerDown={onPointerDown}
      >
        <div class="my-0.5 flex items-center gap-2">
          <h2 class="text-2xl font-semibold">Explorer</h2>
          <Show when={content.readOnly()}>
            <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              Offline: read-only
            </span>
          </Show>
        </div>
        <div ref={setTreeContainerRef} class="flex flex-col flex-1 relative w-full">
          <TreeSelection />
          <Show
            when={!content.loading()}
            fallback={
              <div class="flex flex-col gap-1.5 py-1">
                <div class="flex gap-1 items-center pl-1">
                  <Skeleton class="h-6 w-6 rounded" />
                  <Skeleton class="h-4 w-24" />
                </div>
                <div class="flex gap-1 items-center pl-1">
                  <Skeleton class="h-6 w-6 rounded" />
                  <Skeleton class="h-4 w-32" />
                </div>
                <div class="flex gap-1 items-center pl-1">
                  <Skeleton class="h-6 w-6 rounded" />
                  <Skeleton class="h-4 w-20" />
                </div>
                <div class="flex gap-1 items-center pl-1">
                  <Skeleton class="h-6 w-6 rounded" />
                  <Skeleton class="h-4 w-28" />
                </div>
              </div>
            }
          >
            <div>
              <For each={collections()}>
                {(collection) => {
                  return (
                    <Show when={collection}>
                      <DropdownArea>
                        <ExplorerCollection collection={collection!} topLevel />
                      </DropdownArea>
                    </Show>
                  );
                }}
              </For>
            </div>
            <div>
              <For each={entries()}>
                {(entry) => {
                  return (
                    <div>
                      <Show when={entry}>
                        <DropdownArea>
                          <ExplorerEntry entry={entry} topLevel />
                        </DropdownArea>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
            <Show when={!collections().length && !entries().length}>
              <div>
                {dropdownOptions.map((option) => {
                  return (
                    <IconButton
                      icon={option.icon}
                      class="flex justify-start items-center w-full group/button"
                      disabled={dropdownMenuOpened() || content.readOnly()}
                      label={() => (
                        <div class="px-1 flex flex-1 gap-4">
                          <span class="flex-1 text-start">{option.label}</span>
                          <Show when={option.shortcut}>
                            <Shortcut
                              class="opacity-0 group-hover/button:opacity-50 font-mono text-[90%]"
                              shortcut={option.shortcut!}
                            />
                          </Show>
                        </div>
                      )}
                      variant="text"
                      text="softer"
                      size="small"
                    />
                  );
                })}
              </div>
            </Show>
          </Show>
          <div ref={setElementRef} class="flex-1">
            <Show when={isDraggedOver()}>
              <div class="top-0 left-0 -z-10 rounded-lg absolute h-full w-full opacity-10 bg-gradient-to-tr" />
            </Show>
          </div>
        </div>
        <Show when={boxSelection().active}>
          <div
            class="fixed bg-gradient-to-tr opacity-10 rounded-lg"
            style={{
              top: `${Math.min(boxSelection().y, boxSelection().currentY ?? boxSelection().y)}px`,
              left: `${Math.min(boxSelection().x, boxSelection().currentX ?? boxSelection().x)}px`,
              width: `${boxSelection().width}px`,
              height: `${boxSelection().height}px`
            }}
          />
        </Show>
        <DropdownMenu
          cardProps={{
            class: "w-48"
          }}
          items={dropdownOptions}
          opened={dropdownMenuOpened()}
          setOpened={setDropdownMenuOpened}
        />
      </div>
    </DropdownArea>
  );
};
const ExplorerPanel = () => {
  return (
    <ExplorerProvider>
      <Explorer />
    </ExplorerProvider>
  );
};

export { ExplorerPanel };
