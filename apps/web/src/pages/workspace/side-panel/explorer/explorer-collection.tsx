import { DropdownArea, DropdownMenu, IconButton, MenuItem, createRef } from "@andesine/components";
import { TreeItem, TreeLevel, TreeMap, useTree } from "#web/components/tree";
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
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  canChangeParent,
  canOrderCollections,
  canOrderEntries,
  canTargetCollection,
  createDragData,
  getDraggedCollectionIDs,
  getDraggedEntryIDs
} from "./explorer-dnd";

interface ExplorerCollectionProps {
  collection: Collection;
  topLevel?: boolean;
  onParentDragHighlightChange?(highlighted: boolean): void;
}

const COLLECTION_AUTO_EXPAND_DELAY = 700;

const ExplorerCollection: Component<ExplorerCollectionProps> = (props) => {
  const notify = useNotify();
  const [
    { isSelected, isExpanded, selection, flattenedOrder },
    { setRenaming, toggleExpanded, setExpanded, setSelection }
  ] = useTree();
  const { content } = useWorkspace();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [subtreeRef, setSubtreeRef] = createRef<HTMLElement | null>(null);
  const [isLabelDraggedOver, setIsLabelDraggedOver] = createSignal(false);
  const [isSubtreeDraggedOver, setIsSubtreeDraggedOver] = createSignal(false);
  const [isChildOrderDraggedOver, setIsChildOrderDraggedOver] = createSignal(false);
  const [forcedBoundaryType, setForcedBoundaryType] = createSignal<"collection" | "entry" | null>(
    null
  );
  const [closestEdge, setClosestEdge] = createSignal<Edge | null>(null);
  const isDraggedOver = () =>
    isLabelDraggedOver() || isSubtreeDraggedOver() || isChildOrderDraggedOver();
  let expandTimeout: ReturnType<typeof setTimeout> | undefined;
  const getCollectionParentID = (collectionID: string) => {
    const collection = content.getCollection(collectionID);

    return collection?.ancestors.at(-1) ?? null;
  };
  const getCollectionAncestors = (collectionID: string) => {
    return content.getCollection(collectionID)?.ancestors ?? [];
  };
  const getSiblingCollectionIDs = (parentID: string | null) => {
    return content
      .getContentTreeLevel(parentID)
      .collections()
      .map((collection) => collection.id);
  };
  const canDropIntoCollection = (source: { data: Record<string | symbol, unknown> }) => {
    if (content.readOnly()) return false;

    return canTargetCollection(source.data, props.collection.id, getCollectionAncestors);
  };
  const changesParent = (
    source: { data: Record<string | symbol, unknown> },
    targetParentID: string | null = props.collection.id
  ) => {
    const getEntryParentID = (entryID: string) => {
      return content.getEntry(entryID)?.collectionID ?? null;
    };
    const getCollectionParentID = (collectionID: string) => {
      const collection = content.getCollection(collectionID);

      return collection?.ancestors.at(-1) ?? null;
    };

    return (
      getDraggedEntryIDs(source.data).some(
        (entryID) => getEntryParentID(entryID) !== targetParentID
      ) ||
      getDraggedCollectionIDs(source.data).some((collectionID) => {
        return getCollectionParentID(collectionID) !== targetParentID;
      })
    );
  };
  const setLabelDragHighlight = () => {
    setIsLabelDraggedOver(false);
  };
  const clearParentDragHighlight = () => {
    props.onParentDragHighlightChange?.(false);
  };
  const isDirectSubtreeTarget = (location: any) => {
    const target = location?.current?.dropTargets?.[0]?.data;

    return target?.type === "collection-subtree" && target?.id === props.collection.id;
  };
  const setSubtreeDragHighlight = (
    source: { data: Record<string | symbol, unknown> },
    location: any
  ) => {
    const directTarget = isDirectSubtreeTarget(location);
    const highlighted =
      directTarget && canChangeParent(source.data) && changesParent(source, props.collection.id);
    const canShowBoundary =
      directTarget &&
      highlighted &&
      (collections().length > 0 || entries().length > 0) &&
      canDropIntoCollection(source);
    const nextBoundaryType =
      canShowBoundary && canOrderCollections(source.data)
        ? "collection"
        : canShowBoundary && canOrderEntries(source.data)
          ? "entry"
          : null;

    if (directTarget) {
      clearParentDragHighlight();
    }

    setIsSubtreeDraggedOver(highlighted);
    setForcedBoundaryType(nextBoundaryType);
  };
  const setLabelDropLine = (
    source: { data: Record<string | symbol, unknown> },
    data: Record<string | symbol, unknown>
  ) => {
    const parentID = getCollectionParentID(props.collection.id);
    const edge =
      canOrderCollections(source.data) && canDropIntoCollection(source)
        ? extractClosestEdge(data)
        : null;

    setClosestEdge(edge);
    props.onParentDragHighlightChange?.(
      (Boolean(edge) || !canOrderCollections(source.data)) && changesParent(source, parentID)
    );
  };

  const { collections, entries } = content.getContentTreeLevel(props.collection.id);
  const isExpandedEmpty = () => {
    return isExpanded(props.collection.id) && collections().length === 0 && entries().length === 0;
  };
  const hasSubtreeContent = () => {
    return collections().length > 0 || entries().length > 0;
  };
  const renderBottomDropLineAfterSubtree = () => {
    return closestEdge() === "bottom" && isExpanded(props.collection.id) && hasSubtreeContent();
  };
  const dropdownOptions = createMemo(() => {
    const opts: Array<MenuItem[]> = [];
    const selectedCount = selection().length;
    const isMulti = selectedCount > 1;

    if (!isMulti) {
      opts.push([
        {
          label: "Copy ID",
          icon: "i-lucide:copy",
          shortcut: "$mod+alt+c",
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
            if (content.readOnly()) return;

            setRenaming(props.collection.id);
          },
          shortcut: "f2"
        }
      ]);
      opts.push([
        {
          label: "New piece",
          icon: "i-material-symbols:create-new-folder-outline-rounded",
          onClick: () => {
            if (content.readOnly()) return;

            const entry = content.createEntry(props.collection.id);

            setRenaming(entry?.id || "");
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
            if (content.readOnly()) return;

            const collection = content.createCollection(props.collection.id);

            setRenaming(collection?.id || "");
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

          if (content.readOnly()) return;

          content.deleteContent(isMulti ? selectedIDs : [props.collection.id]);
          setSelection([]);
        },
        shortcut: "$mod+backspace"
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
  const BoundaryDropTarget: Component<{ type: "collection" | "entry" }> = (boundaryProps) => {
    const [boundaryRef, setBoundaryRef] = createRef<HTMLElement | null>(null);
    const [isBoundaryDraggedOver, setIsBoundaryDraggedOver] = createSignal(false);
    const boundaryTargetType = () =>
      boundaryProps.type === "collection" ? "collection-boundary" : "entry-boundary";
    const matchingContentChangesParent = (source: { data: Record<string | symbol, unknown> }) => {
      const targetParentID = props.collection.id;

      if (boundaryProps.type === "collection") {
        const getCollectionParentID = (collectionID: string) => {
          const collection = content.getCollection(collectionID);

          return collection?.ancestors.at(-1) ?? null;
        };

        if (source.data.type === "collection") {
          return getCollectionParentID(source.data.id as string) !== targetParentID;
        }

        if (source.data.type === "multi") {
          return ((source.data.collections as string[] | undefined) ?? []).some((collectionID) => {
            return getCollectionParentID(collectionID) !== targetParentID;
          });
        }

        return false;
      }

      const getEntryParentID = (entryID: string) => {
        return content.getEntry(entryID)?.collectionID ?? null;
      };

      if (source.data.type === "entry") {
        return getEntryParentID(source.data.id as string) !== targetParentID;
      }

      if (source.data.type === "multi") {
        return ((source.data.entries as string[] | undefined) ?? []).some((entryID) => {
          return getEntryParentID(entryID) !== targetParentID;
        });
      }

      return false;
    };
    const canDropOnBoundary = (source: { data: Record<string | symbol, unknown> }) => {
      const canOrderMatchingContent =
        boundaryProps.type === "collection"
          ? canOrderCollections(source.data)
          : canOrderEntries(source.data);

      return canOrderMatchingContent && canDropIntoCollection(source);
    };
    const updateBoundaryHighlight = (source: { data: Record<string | symbol, unknown> }) => {
      const highlighted = canDropOnBoundary(source);

      setIsBoundaryDraggedOver(highlighted);
      setIsSubtreeDraggedOver(highlighted && matchingContentChangesParent(source));
    };
    const resetBoundaryHighlight = () => {
      setIsBoundaryDraggedOver(false);
      setIsSubtreeDraggedOver(false);
    };
    const isActive = () => isBoundaryDraggedOver() || forcedBoundaryType() === boundaryProps.type;

    onMount(() => {
      const element = boundaryRef();

      if (!element) return;

      const cleanup = dropTargetForElements({
        element,
        getData: () => {
          return { type: boundaryTargetType(), id: props.collection.id };
        },
        canDrop: ({ source }) => canDropOnBoundary(source),
        onDragEnter: ({ source }) => {
          updateBoundaryHighlight(source);
        },
        onDrag: ({ source }) => {
          updateBoundaryHighlight(source);
        },
        onDragLeave: () => {
          resetBoundaryHighlight();
        },
        onDrop: () => {
          resetBoundaryHighlight();
        }
      });

      onCleanup(() => {
        cleanup();
      });
    });

    return (
      <div class="relative h-0">
        <div ref={setBoundaryRef} class="absolute inset-x-0 -top-3 h-6 pointer-events-none" />
        <Show when={isActive()}>
          <div class="flex bg-gradient-to-tr h-2.5px w-full absolute top-[-1.25px] items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary z-10">
            <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
              <div class="h-1 w-1 bg-gray-100 rounded-full" />
            </div>
          </div>
        </Show>
      </div>
    );
  };

  createEffect(
    on(menuOpened, (opened) => {
      if (!opened) return;

      setSelection((selection) => {
        return selection.includes(props.collection.id) ? selection : [props.collection.id];
      });
    })
  );

  onMount(() => {
    const element = elementRef();
    const subtreeElement = subtreeRef();

    if (!element) return;

    const cleanup = combine(
      draggable({
        element,
        getInitialData: () => {
          const sel = selection();
          const isDraggingSelected = sel.includes(props.collection.id);

          if (isDraggingSelected && sel.length > 1) {
            return createDragData({
              draggedID: props.collection.id,
              draggedType: "collection",
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
        getData: ({ input }) => {
          return attachClosestEdge(
            { type: "collection", id: props.collection.id },
            {
              element,
              input,
              allowedEdges: ["top", "bottom"]
            }
          );
        },
        canDrop: ({ source }) => canDropIntoCollection(source),
        onDragEnter: ({ source, self }) => {
          setLabelDragHighlight();
          setLabelDropLine(source, self.data);
          if (!isExpanded(props.collection.id)) {
            expandTimeout = setTimeout(() => {
              setExpanded((prev) => [...prev, props.collection.id]);
            }, COLLECTION_AUTO_EXPAND_DELAY);
          }
        },
        onDrag: ({ source, self }) => {
          setLabelDragHighlight();
          setLabelDropLine(source, self.data);
        },
        onDragLeave: () => {
          setIsLabelDraggedOver(false);
          setClosestEdge(null);
          clearParentDragHighlight();
          clearTimeout(expandTimeout);
        },
        onDrop: () => {
          setIsLabelDraggedOver(false);
          setClosestEdge(null);
          clearParentDragHighlight();
          clearTimeout(expandTimeout);
        }
      }),
      ...(subtreeElement
        ? [
            dropTargetForElements({
              element: subtreeElement,
              getData: () => {
                return { type: "collection-subtree", id: props.collection.id };
              },
              canDrop: ({ source }) => canDropIntoCollection(source),
              onDragEnter: ({ source, location }) => {
                setSubtreeDragHighlight(source, location);
              },
              onDrag: ({ source, location }) => {
                setSubtreeDragHighlight(source, location);
              },
              onDragLeave: () => {
                setIsSubtreeDraggedOver(false);
                setForcedBoundaryType(null);
              },
              onDrop: () => {
                setIsSubtreeDraggedOver(false);
                setForcedBoundaryType(null);
              }
            })
          ]
        : [])
    );

    onCleanup(() => {
      cleanup();
    });
  });

  return (
    <DropdownArea>
      <div class="relative">
        <Show when={isDraggedOver() && isExpandedEmpty() && !isSelected(props.collection.id)}>
          <div
            class={clsx(
              "absolute inset-0 -z-10 rounded-r-lg opacity-10 from-secondary via-primary to-transparent bg-gradient-to-r",
              props.topLevel && "rounded-l-lg"
            )}
          />
        </Show>
        <div class="flex relative min-h-7">
          <TreeItem
            id={props.collection.id}
            label={props.collection.name}
            topLevel={props.topLevel}
            highlighted={isDraggedOver() && !isExpandedEmpty()}
            selectable
            ref={setElementRef}
            dataAttributes={{ collection: props.collection.id }}
            onClick={() => {
              toggleExpanded(props.collection.id);
            }}
            onRename={(name) => {
              if (content.readOnly()) return;

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
                portal={false}
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
          <Show when={closestEdge() && !renderBottomDropLineAfterSubtree()}>
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
        <div ref={setSubtreeRef}>
          <TreeLevel
            levelID={props.collection.id}
            tree={treeMap}
            emptyMessage="Collection empty"
            highlighted={isDraggedOver()}
            highlightBackground={!isExpandedEmpty()}
            renderCollectionBoundary={() => <BoundaryDropTarget type="collection" />}
            renderEntryBoundary={() => <BoundaryDropTarget type="entry" />}
            renderLevel={(id) => {
              const collection = () => content.getCollection(id);

              return (
                <Show when={collection()}>
                  <ExplorerCollection
                    collection={collection()!}
                    onParentDragHighlightChange={setIsChildOrderDraggedOver}
                  />
                </Show>
              );
            }}
            renderItem={(entryID) => {
              const entry = () => content.getEntry(entryID);

              return (
                <Show when={entry()}>
                  <DropdownArea>
                    <ExplorerEntry
                      entry={entry()!}
                      onParentDragHighlightChange={setIsChildOrderDraggedOver}
                    />
                  </DropdownArea>
                </Show>
              );
            }}
          />
        </div>
        <Show when={renderBottomDropLineAfterSubtree()}>
          <div class="relative h-0">
            <div class="flex bg-gradient-to-tr h-2.5px w-full absolute top-[-1.25px] items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary z-10">
              <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
                <div class="h-1 w-1 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        </Show>
      </div>
    </DropdownArea>
  );
};

export { ExplorerCollection };
