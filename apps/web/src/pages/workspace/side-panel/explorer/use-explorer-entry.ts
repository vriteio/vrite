import { createRef } from "@andesine/components";
import { useTree } from "#web/components/tree";
import { useWorkspace } from "#web/context/workspace";
import { type Entry } from "#web/lib/api";
import { createSignal, onCleanup, onMount } from "solid-js";
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
import {
  canOrderEntries,
  createDragData,
  getDraggedEntryIDs,
  getExplorerDragPreviewOffset
} from "./explorer-dnd";
import { useEntryMenu } from "./use-entry-menu";
import { useExplorerItemSwipe } from "./use-explorer-item-swipe";

interface ExplorerEntryProps {
  entry: Entry;
  topLevel?: boolean;
  onParentDragHighlightChange?(highlighted: boolean): void;
}

const useExplorerEntry = (props: ExplorerEntryProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const { workspaceID, content } = useWorkspace();
  const [{ isSelected, selection, flattenedOrder }, { setSelection }] = useTree();
  const { dropdownOptions, menuOpened, setMenuOpened } = useEntryMenu(props.entry.id);
  const swipe = useExplorerItemSwipe({
    enabled: () => selection().length <= 1,
    onOpen: () => setMenuOpened(true)
  });
  const [elementRef, setElementRef] = createRef<HTMLElement | null>(null);
  const [closestEdge, setClosestEdge] = createSignal<Edge | null>(null);
  const getCollectionParentID = (collectionID: string) => {
    const collection = content.collections.get({ collectionID });

    return collection?.ancestors.at(-1) ?? null;
  };
  const getSiblingCollectionIDs = (parentID: string | null) => {
    return content.tree
      .getLevel({ parentID })
      .collections()
      .map((collection) => collection.id);
  };
  const changesEntryParent = (source: { data: Record<string | symbol, unknown> }) => {
    const entryIDs = getDraggedEntryIDs(source.data);

    return entryIDs.some((entryID) => {
      return (
        (content.entries.get({ entryID })?.collectionID ?? null) !==
        (props.entry.collectionID ?? null)
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
  const canEditEntry = (entryID: string) => {
    const entry = content.entries.get({ entryID });

    return content.hasCollectionPermission(entry?.collectionID || null, "content");
  };
  const canEditCollection = (collectionID: string) => {
    return content.hasCollectionPermission(collectionID, "content");
  };
  const canEditSelection = () => {
    const selectedIDs = selection().includes(props.entry.id) ? selection() : [props.entry.id];
    const selected = content.tree.splitIDs({ ids: selectedIDs });

    return selected.entries.every(canEditEntry) && selected.collections.every(canEditCollection);
  };
  onMount(() => {
    const element = elementRef();

    if (!element) return;

    const cleanup = combine(
      draggable({
        element,
        canDrag: () =>
          !content.offline() &&
          !content.syncing() &&
          canEditSelection() &&
          !menuOpened() &&
          !swipe.swiping(),
        getInitialData: () => {
          const sel = selection();
          const isDraggingSelected = sel.includes(props.entry.id);

          if (isDraggingSelected && sel.length > 1) {
            return createDragData({
              draggedID: props.entry.id,
              draggedType: "entry",
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

          return { type: "entry", id: props.entry.id };
        },
        onGenerateDragPreview({ nativeSetDragImage }) {
          const sel = selection();
          const count = sel.includes(props.entry.id) && sel.length > 1 ? sel.length : 1;

          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: getExplorerDragPreviewOffset,
            render({ container }) {
              const el = document.createElement("div");

              Object.assign(el.style, {
                padding: "0.25rem 0.625rem",
                background: "#333",
                color: "#fff",
                borderRadius: "0.375rem",
                fontSize: "0.8125rem",
                whiteSpace: "nowrap"
              });
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
        canDrop: ({ source }) => {
          return (
            !content.readOnly(props.entry.collectionID || null) && canOrderEntries(source.data)
          );
        },
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

  return {
    closestEdge,
    content,
    dropdownOptions,
    setElementRef,
    handleClick,
    isSelected,
    menuOpened,
    params,
    selection,
    setMenuOpened,
    swipe
  };
};

export { useExplorerEntry };
export type { ExplorerEntryProps };
