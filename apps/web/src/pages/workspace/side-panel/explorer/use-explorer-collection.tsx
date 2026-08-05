import { createRef } from "@andesine/components";
import { type TreeMap, useTree } from "#web/components/tree";
import { type Component, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { type Collection } from "#web/lib/api";
import {
  draggable,
  dropTargetForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { type DragLocationHistory } from "@atlaskit/pragmatic-drag-and-drop/types";
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
import { CollectionBoundaryDropTarget } from "./collection-boundary-drop-target";
import { useCollectionMenu } from "./use-collection-menu";

interface ExplorerCollectionProps {
  collection: Collection;
  topLevel?: boolean;
  onParentDragHighlightChange?(highlighted: boolean): void;
}

const COLLECTION_AUTO_EXPAND_DELAY = 700;

const useExplorerCollection = (props: ExplorerCollectionProps) => {
  const [
    { isSelected, isExpanded, selection, flattenedOrder },
    { toggleExpanded, setExpanded, setSelection }
  ] = useTree();
  const { content } = useWorkspace();
  const { dropdownOptions, menuOpened, setMenuOpened } = useCollectionMenu(props.collection.id);
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
    const collection = content.collections.get({ collectionID });

    return collection?.ancestors.at(-1) ?? null;
  };
  const getCollectionAncestors = (collectionID: string) => {
    return content.collections.get({ collectionID })?.ancestors ?? [];
  };
  const getSiblingCollectionIDs = (parentID: string | null) => {
    return content.tree
      .getLevel({ parentID })
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
      return content.entries.get({ entryID })?.collectionID ?? null;
    };
    const getCollectionParentID = (collectionID: string) => {
      const collection = content.collections.get({ collectionID });

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
  const isDirectSubtreeTarget = (location: DragLocationHistory) => {
    const target = location?.current?.dropTargets?.[0]?.data;

    return target?.type === "collection-subtree" && target?.id === props.collection.id;
  };
  const setSubtreeDragHighlight = (
    source: { data: Record<string | symbol, unknown> },
    location: DragLocationHistory
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

  const { collections, entries } = content.tree.getLevel({ parentID: props.collection.id });
  const isExpandedEmpty = () => {
    return isExpanded(props.collection.id) && collections().length === 0 && entries().length === 0;
  };
  const hasSubtreeContent = () => {
    return collections().length > 0 || entries().length > 0;
  };
  const renderBottomDropLineAfterSubtree = () => {
    return closestEdge() === "bottom" && isExpanded(props.collection.id) && hasSubtreeContent();
  };
  const treeMap = createMemo<TreeMap>(() => {
    return {
      [props.collection.id]: {
        items: entries().map((entry) => entry.id),
        levels: collections().map((col) => col.id)
      }
    };
  });
  const BoundaryDropTarget: Component<{ type: "collection" | "entry" }> = (boundaryProps) => (
    <CollectionBoundaryDropTarget
      type={boundaryProps.type}
      collectionID={props.collection.id}
      content={content}
      canDropIntoCollection={canDropIntoCollection}
      forcedType={forcedBoundaryType}
      setSubtreeDraggedOver={setIsSubtreeDraggedOver}
    />
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
              splitContentIDs: (ids) => content.tree.splitIDs({ ids }),
              flattenedOrder: flattenedOrder(),
              isCollection: (id) => Boolean(content.collections.get({ collectionID: id })),
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
              getData: () => ({ type: "collection-subtree", id: props.collection.id }),
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

  return {
    BoundaryDropTarget,
    closestEdge,
    content,
    dropdownOptions,
    isDraggedOver,
    isExpanded,
    isExpandedEmpty,
    isSelected,
    menuOpened,
    renderBottomDropLineAfterSubtree,
    setElementRef,
    setIsChildOrderDraggedOver,
    setMenuOpened,
    setSubtreeRef,
    toggleExpanded,
    treeMap
  };
};

export { useExplorerCollection };
export type { ExplorerCollectionProps };
