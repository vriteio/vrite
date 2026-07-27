import {
  DropdownArea,
  DropdownMenu,
  IconButton,
  Skeleton,
  Shortcut,
  useShortcuts,
  createRef,
  createDebounced
} from "@andesine/components";
import { TreeRoot, TreeSelection, useTree } from "#web/components/tree";
import { ExplorerProvider } from "./explorer-context";
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { ExplorerEntry } from "./explorer-entry";
import { ExplorerCollection } from "./explorer-collection";
import {
  monitorForElements,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { useWorkspace } from "#web/context/workspace";
import { useNotify } from "#web/context/notifications";
import {
  canChangeParent,
  canOrderCollections,
  canOrderEntries,
  getDraggedCollectionIDs,
  getDraggedEntryIDs
} from "./explorer-dnd";

const Explorer = () => {
  const registerShortcuts = useShortcuts();
  const notify = useNotify();
  const navigate = useNavigate();
  const [
    { focusedID, selection, flattenedLayout, flattenedOrder, gap },
    {
      setExactSelection,
      setExpanded,
      setFocusedID,
      setFocusedItem,
      setSelection,
      setRenaming,
      toggleExpanded
    }
  ] = useTree();
  const { workspaceID, content } = useWorkspace();
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [treeContainerRef, setTreeContainerRef] = createRef<HTMLElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = createSignal(false);
  const [pointerInsideExplorer, setPointerInsideExplorer] = createSignal(false);
  const [focusInsideExplorer, setFocusInsideExplorer] = createSignal(false);
  const [dropdownMenuOpened, setDropdownMenuOpened] = createSignal(false);
  const [pointerDown, setPointerDown] = createSignal(false);
  const [selectionRangeAnchorID, setSelectionRangeAnchorID] = createSignal<string | null>(null);
  const [selectionRangeHeadID, setSelectionRangeHeadID] = createSignal<string | null>(null);
  const [boxSelection, setBoxSelection] = createSignal({
    active: false,
    x: 0,
    y: 0,
    currentX: 0,
    currentY: 0,
    width: 0,
    height: 0
  });
  const contentLoading = createDebounced(content.loading, 100);
  const isEditingText = () => {
    const activeElement = document.activeElement;

    if (!(activeElement instanceof HTMLElement)) return false;

    return Boolean(
      activeElement.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")
    );
  };
  const notifyReadOnly = () => {
    notify({
      type: "error",
      text: "Explorer is read-only while offline"
    });
  };
  const getVisibleIDs = () => {
    return flattenedOrder();
  };
  const getFocusedVisibleID = () => {
    const visibleIDs = getVisibleIDs();
    const focused = focusedID();

    if (focused && visibleIDs.includes(focused)) return focused;

    return null;
  };
  const isExplorerKeyboardActive = () => pointerInsideExplorer() || focusInsideExplorer();
  const scrollFocusedItemIntoView = (id: string) => {
    const container = treeContainerRef();

    if (!container) return;

    const item = Array.from(container.querySelectorAll<HTMLElement>("[data-tree-item]")).find(
      (element) => element.dataset.treeItem === id
    );

    if (!item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();

    if (itemRect.top < containerRect.top) {
      container.scrollTop -= containerRect.top - itemRect.top;
    } else if (itemRect.bottom > containerRect.bottom) {
      container.scrollTop += itemRect.bottom - containerRect.bottom;
    }
  };
  const focusVisibleItem = (id: string, scroll = false) => {
    setFocusedItem(id, "keyboard");

    if (scroll) {
      queueMicrotask(() => scrollFocusedItemIntoView(id));
    }
  };
  const getCommandTargetID = () => {
    const selected = selection();

    if (selected.length > 0) {
      return selected.length === 1 ? selected[0] : null;
    }

    return getFocusedVisibleID();
  };
  const getCommandTargetCollectionID = () => {
    const targetID = getCommandTargetID();

    return targetID && content.getCollection(targetID) ? targetID : null;
  };
  const changesRootParent = (source: { data: Record<string | symbol, unknown> }) => {
    const getEntryParentID = (entryID: string) => {
      return content.getEntry(entryID)?.collectionID ?? null;
    };
    const getCollectionParentID = (collectionID: string) => {
      const collection = content.getCollection(collectionID);

      return collection?.ancestors.at(-1) ?? null;
    };

    return (
      getDraggedEntryIDs(source.data).some((entryID) => getEntryParentID(entryID) !== null) ||
      getDraggedCollectionIDs(source.data).some(
        (collectionID) => getCollectionParentID(collectionID) !== null
      )
    );
  };
  const createEntry = (collectionID?: string) => {
    if (content.readOnly()) {
      notifyReadOnly();

      return;
    }

    const entry = content.createEntry(collectionID);

    setRenaming(entry?.id || "");
  };
  const createCollection = (collectionID?: string) => {
    if (content.readOnly()) {
      notifyReadOnly();

      return;
    }

    const collection = content.createCollection(collectionID);

    setRenaming(collection?.id || "");
  };
  const deleteSelection = () => {
    const ids = selection();

    if (ids.length === 0) return false;

    if (content.readOnly()) {
      notifyReadOnly();

      return true;
    }

    content.deleteContent(ids);
    setSelection([]);

    return true;
  };
  const deleteFocused = () => {
    const id = getFocusedVisibleID();

    if (!id) return false;

    if (content.readOnly()) {
      notifyReadOnly();

      return true;
    }

    content.deleteContent([id]);
    setFocusedID(null);

    return true;
  };
  const createEntryForCommandTarget = () => {
    const collectionID = getCommandTargetCollectionID();

    if (!collectionID) return false;

    const entry = content.createEntry(collectionID ?? undefined);

    setExpanded((prev) => (prev.includes(collectionID) ? prev : [...prev, collectionID]));

    setRenaming(entry?.id || "");

    return true;
  };
  const createCollectionForCommandTarget = () => {
    const collectionID = getCommandTargetCollectionID();

    if (!collectionID) return false;

    const collection = content.createCollection(collectionID ?? undefined);

    setExpanded((prev) => (prev.includes(collectionID) ? prev : [...prev, collectionID]));

    setRenaming(collection?.id || "");

    return true;
  };
  const renameCommandTarget = () => {
    const targetID = getCommandTargetID();

    if (!targetID || content.readOnly()) return false;

    setRenaming(targetID);

    return true;
  };
  const activateFocusedItem = () => {
    const id = getFocusedVisibleID();

    if (!id) return false;

    if (content.getCollection(id)) {
      toggleExpanded(id);

      return true;
    }

    if (content.getEntry(id)) {
      navigate(`/${workspaceID()}/${id}`);

      return true;
    }

    return false;
  };
  const navigateFocusedItem = (direction: "up" | "down") => {
    const visibleIDs = getVisibleIDs();

    if (visibleIDs.length === 0) return false;

    const currentID = getFocusedVisibleID();
    const currentIndex = currentID ? visibleIDs.indexOf(currentID) : -1;
    const nextIndex =
      currentIndex === -1
        ? direction === "down"
          ? 0
          : visibleIDs.length - 1
        : (currentIndex + (direction === "down" ? 1 : -1) + visibleIDs.length) % visibleIDs.length;
    const nextID = visibleIDs[nextIndex];

    if (!nextID) return false;

    setSelectionRangeAnchorID(null);
    setSelectionRangeHeadID(null);
    focusVisibleItem(nextID, true);

    return true;
  };
  const selectVisibleRange = (visibleIDs: string[], fromIndex: number, toIndex: number) => {
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);

    return visibleIDs.slice(startIndex, endIndex + 1);
  };
  const extendSelectionWithFocusedItem = (direction: "up" | "down") => {
    const visibleIDs = getVisibleIDs();

    if (visibleIDs.length === 0) return false;

    const currentID = getFocusedVisibleID();
    const focusedIndex = currentID ? visibleIDs.indexOf(currentID) : -1;

    if (!currentID || focusedIndex === -1) return navigateFocusedItem(direction);

    const anchorID = selectionRangeAnchorID();
    const headID = selectionRangeHeadID();
    const anchorIndex = anchorID ? visibleIDs.indexOf(anchorID) : -1;
    const headIndex = headID ? visibleIDs.indexOf(headID) : -1;
    const canContinueRange =
      anchorID && headID && anchorIndex !== -1 && headIndex !== -1 && headID === currentID;
    const nextAnchorID = canContinueRange ? anchorID : currentID;
    const nextAnchorIndex = canContinueRange ? anchorIndex : focusedIndex;
    const currentHeadIndex = canContinueRange ? headIndex : focusedIndex;

    if (!canContinueRange) {
      setExactSelection([currentID]);
      setSelectionRangeAnchorID(currentID);
      setSelectionRangeHeadID(currentID);

      return true;
    }

    const nextIndex = Math.min(
      visibleIDs.length - 1,
      Math.max(0, currentHeadIndex + (direction === "down" ? 1 : -1))
    );

    if (nextIndex === currentHeadIndex) return true;

    focusVisibleItem(visibleIDs[nextIndex], true);

    if (canContinueRange && nextIndex === nextAnchorIndex) {
      setExactSelection([]);
      setSelectionRangeAnchorID(null);
      setSelectionRangeHeadID(null);

      return true;
    }

    setSelectionRangeAnchorID(nextAnchorID);
    setSelectionRangeHeadID(visibleIDs[nextIndex]);
    setExactSelection(selectVisibleRange(visibleIDs, nextAnchorIndex, nextIndex));

    return true;
  };
  const onExplorerKeyDown = (event: KeyboardEvent) => {
    if (!isExplorerKeyboardActive()) return;
    if (isEditingText()) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? "down" : "up";

      if (event.shiftKey) {
        extendSelectionWithFocusedItem(direction);
      } else {
        navigateFocusedItem(direction);
      }

      return;
    }

    if (event.key === "Enter") {
      if (activateFocusedItem()) {
        event.preventDefault();
      }

      return;
    }

    if (event.shiftKey && event.key.toLowerCase() === "r") {
      if (renameCommandTarget()) {
        event.preventDefault();
      }
    }
  };
  const canHandleExplorerShortcut = () => {
    return isExplorerKeyboardActive() && !isEditingText();
  };
  const resetExplorerFocus = () => {
    setFocusedID(null);
    setSelectionRangeAnchorID(null);
    setSelectionRangeHeadID(null);
  };
  const onExplorerPointerEnter = () => {
    setPointerInsideExplorer(true);
  };
  const onExplorerPointerLeave = () => {
    setPointerInsideExplorer(false);

    if (!focusInsideExplorer()) {
      resetExplorerFocus();
    }
  };
  const onExplorerFocusIn = () => {
    setFocusInsideExplorer(true);
  };
  const onExplorerFocusOut = (event: FocusEvent) => {
    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget instanceof Node) {
      if (event.currentTarget.contains(nextTarget)) return;
    }

    setFocusInsideExplorer(false);
    setPointerInsideExplorer(false);
    resetExplorerFocus();
  };
  const onPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (
      !event.target.closest("[data-explorer-panel]") ||
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

      flattenedLayout().forEach((item) => {
        const itemTop = containerRect.top + item.top - scrollTop;
        const itemBottom = itemTop + item.height;

        if (
          containerRect.left < selRight &&
          itemTop < selBottom &&
          containerRect.right > selLeft &&
          itemBottom > selTop
        ) {
          selectedIDs.push(item.id);
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
    }
  };
  const dropdownOptions = [
    {
      label: "New entry",
      icon: "i-lucide:file-plus-2",
      shortcut: "$mod+E",
      onClick: async () => {
        createEntry();
      }
    },
    {
      label: "New collection",
      icon: "i-material-symbols:create-new-folder-outline-rounded",
      onClick: async () => {
        createCollection();
      },
      shortcut: "$mod+shift+E"
    }
  ];
  const { collections, entries } = content.getContentTreeLevel(null);
  const getOrderedIDs = (ids: string[]) => {
    const idSet = new Set(ids);
    const orderedIDs = flattenedOrder().filter((id) => idSet.has(id));

    return [...orderedIDs, ...ids.filter((id) => !orderedIDs.includes(id))];
  };
  const moveEntries = (input: {
    entryIDs: string[];
    collectionID: string | null;
    targetEntryID?: string;
    edge?: "top" | "bottom" | null;
  }) => {
    const entryIDs = getOrderedIDs(input.entryIDs);
    const orders = content.getEntryDropOrders({
      collectionID: input.collectionID,
      targetEntryID: input.targetEntryID,
      edge: input.edge,
      entryIDs
    });

    entryIDs.forEach((entryID, index) => {
      content.updateEntry(entryID, {
        collectionID: input.collectionID ?? undefined,
        order: orders[index]
      });
    });
  };
  const getLastEntryID = (collectionID: string | null) => {
    return content.getContentTreeLevel(collectionID).entries().at(-1)?.id;
  };
  const moveCollections = (input: {
    collectionIDs: string[];
    parentID: string | null;
    targetCollectionID?: string;
    edge?: "top" | "bottom" | null;
  }) => {
    const collectionIDs = getOrderedIDs(input.collectionIDs);
    const startIndex = content.getCollectionDropIndex({
      parentID: input.parentID,
      targetCollectionID: input.targetCollectionID,
      edge: input.edge,
      collectionIDs
    });

    collectionIDs.forEach((collectionID, offset) => {
      content.moveCollection(
        collectionID,
        input.parentID,
        startIndex === undefined ? undefined : startIndex + offset
      );
    });
  };

  createEffect(() => {
    const unregister = monitorForElements({
      onDrop({ source, location }) {
        if (content.readOnly()) return;

        const target = location.current.dropTargets[0];
        if (!target) return;

        const sourceData = source.data;
        const targetData = target.data;

        const entryIDs = getDraggedEntryIDs(sourceData);
        const collectionIDs = getDraggedCollectionIDs(sourceData);

        if (!entryIDs.length && !collectionIDs.length) {
          return;
        }

        let moved = false;

        if (targetData.type === "entry") {
          const targetEntryID = targetData.id as string;

          // Prevent drop on self
          if (entryIDs.length === 1 && entryIDs[0] === targetEntryID) return;

          const edge = extractClosestEdge(targetData) as "top" | "bottom" | null;
          const targetCollectionID = (targetData.collectionID as string | undefined) ?? null;

          if (entryIDs.length > 0) {
            if (!canOrderEntries(sourceData)) return;

            moveEntries({
              entryIDs,
              collectionID: targetCollectionID,
              targetEntryID,
              edge
            });
            moved = true;
          }

          if (collectionIDs.length > 0) {
            return;
          }
        } else if (
          targetData.type === "collection" ||
          targetData.type === "collection-subtree" ||
          targetData.type === "collection-boundary" ||
          targetData.type === "entry-boundary"
        ) {
          const targetCollectionID = targetData.id as string;
          const targetCollection = content.getCollection(targetCollectionID);
          const edge =
            targetData.type === "collection"
              ? (extractClosestEdge(targetData) as "top" | "bottom" | null)
              : null;

          if (
            entryIDs.length > 0 &&
            (targetData.type === "collection-subtree" || targetData.type === "entry-boundary")
          ) {
            const lastEntryID = canOrderEntries(sourceData)
              ? getLastEntryID(targetCollectionID)
              : undefined;

            moveEntries({
              entryIDs,
              collectionID: targetCollectionID,
              targetEntryID: lastEntryID,
              edge: lastEntryID ? "bottom" : null
            });
            moved = true;
          }

          if (collectionIDs.length > 0) {
            if (targetData.type === "collection") {
              if (!edge || !targetCollection) return;
              const parentID = targetCollection.ancestors.at(-1) ?? null;

              if (!canOrderCollections(sourceData)) {
                moveCollections({
                  collectionIDs,
                  parentID
                });

                if (entryIDs.length > 0) {
                  moveEntries({
                    entryIDs,
                    collectionID: parentID
                  });
                }

                moved = true;
              } else {
                moveCollections({
                  collectionIDs,
                  parentID,
                  targetCollectionID,
                  edge
                });
                moved = true;
              }
            } else if (
              targetData.type === "collection-subtree" ||
              targetData.type === "collection-boundary"
            ) {
              moveCollections({
                collectionIDs,
                parentID: targetCollectionID
              });
              moved = true;
            }
          }
        } else if (targetData.type === "explorer") {
          if (entryIDs.length > 0) {
            moveEntries({
              entryIDs,
              collectionID: null
            });
            moved = true;
          }

          if (collectionIDs.length > 0) {
            moveCollections({
              collectionIDs,
              parentID: null
            });
            moved = true;
          }
        }

        if (moved) {
          setSelection([]);
        }
      }
    });

    onCleanup(unregister);
  });

  createEffect(() => {
    document.body.addEventListener("pointermove", onPointerMove);
    document.body.addEventListener("pointerup", onPointerEnd);
    document.body.addEventListener("pointerleave", onPointerEnd);
    document.body.addEventListener("contextmenu", onPointerEnd);
    document.body.addEventListener("keydown", onExplorerKeyDown);
    const unregisterShortcuts = registerShortcuts({
      "$mod+E": () => {
        if (!canHandleExplorerShortcut()) return false;

        createEntry();

        return true;
      },
      "$mod+shift+E": () => {
        if (!canHandleExplorerShortcut()) return false;

        createCollection();

        return true;
      },
      "$mod+n": () => {
        if (!canHandleExplorerShortcut()) return false;

        if (content.readOnly()) {
          notifyReadOnly();

          return true;
        }

        createEntryForCommandTarget();

        return true;
      },
      "$mod+shift+n": () => {
        if (!canHandleExplorerShortcut()) return false;

        if (content.readOnly()) {
          notifyReadOnly();

          return true;
        }

        createCollectionForCommandTarget();

        return true;
      },
      "$mod+backspace": () => {
        if (!canHandleExplorerShortcut()) return false;

        return deleteSelection() || deleteFocused();
      },
      "delete": () => {
        if (!canHandleExplorerShortcut()) return false;

        return deleteSelection() || deleteFocused();
      }
    });

    onCleanup(() => {
      document.body.removeEventListener("pointermove", onPointerMove);
      document.body.removeEventListener("pointerup", onPointerEnd);
      document.body.removeEventListener("pointerleave", onPointerEnd);
      document.body.removeEventListener("contextmenu", onPointerEnd);
      document.body.removeEventListener("keydown", onExplorerKeyDown);
      unregisterShortcuts();
    });
  });

  onMount(() => {
    const element = elementRef();
    if (!element) return;

    const cleanup = dropTargetForElements({
      element,
      getData: () => ({ type: "explorer", id: "" }),
      canDrop: ({ source }) => !content.readOnly() && canChangeParent(source.data),
      onDragEnter: ({ source }) => {
        setIsDraggedOver(changesRootParent(source));
      },
      onDrag: ({ source }) => {
        setIsDraggedOver(changesRootParent(source));
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
      <TreeRoot>
        <div
          data-explorer-panel
          tabIndex={0}
          class="flex flex-col flex-1 justify-center items-start px-1 outline-none"
          onFocusIn={onExplorerFocusIn}
          onFocusOut={onExplorerFocusOut}
          onPointerDown={onPointerDown}
          onPointerEnter={onExplorerPointerEnter}
          onPointerLeave={onExplorerPointerLeave}
        >
          <div class="my-0.5 flex items-center gap-2">
            <h2 class="text-2xl font-semibold">Explorer</h2>
            <Show when={content.offline()}>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Offline: read-only
              </span>
            </Show>
          </div>
          <div
            ref={setTreeContainerRef}
            class="flex flex-col flex-1 relative w-full overflow-y-auto"
            style={{ gap: `${gap}px` }}
          >
            <TreeSelection />
            <Show
              when={!contentLoading()}
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
              <div class="contents">
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
              <div class="contents">
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
                        onClick={option.onClick}
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
              class: "w-52"
            }}
            items={dropdownOptions}
            opened={dropdownMenuOpened()}
            portal={false}
            setOpened={setDropdownMenuOpened}
          />
        </div>
      </TreeRoot>
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
