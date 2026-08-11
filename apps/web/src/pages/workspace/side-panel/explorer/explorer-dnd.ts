type ExplorerDragData = Record<string | symbol, unknown>;

const DRAG_PREVIEW_POINTER_GAP = 8;
const isExplorerLongPressEnabled = (event: PointerEvent | MouseEvent) => {
  const target = event.target;
  const isTouchPointer = "pointerType" in event && event.pointerType === "touch";
  const isExplorerItem =
    target instanceof Element && Boolean(target.closest("[data-explorer-item]"));

  return !isTouchPointer || !isExplorerItem;
};
const EXPLORER_GESTURE_PROPS = {
  enabled: isExplorerLongPressEnabled,
  longPressDelay: 750,
  longPressTolerance: 10
};

const getExplorerDragPreviewOffset = ({ container }: { container: HTMLElement }) => {
  if (!window.matchMedia("(pointer: coarse)").matches) return { x: 0, y: 0 };

  const { height, width } = container.getBoundingClientRect();

  return {
    x: width + DRAG_PREVIEW_POINTER_GAP,
    y: height + DRAG_PREVIEW_POINTER_GAP
  };
};

const getDraggedEntryIDs = (data: ExplorerDragData) => {
  if (data.type === "entry") return typeof data.id === "string" ? [data.id] : [];
  if (data.type === "multi") return toStringIDs(data.entries);

  return [];
};

const getDraggedCollectionIDs = (data: ExplorerDragData) => {
  if (data.type === "collection") return typeof data.id === "string" ? [data.id] : [];
  if (data.type === "multi") return toStringIDs(data.collections);

  return [];
};

const toStringIDs = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];

const hasDraggedEntries = (data: ExplorerDragData) => {
  return getDraggedEntryIDs(data).length > 0;
};

const hasDraggedCollections = (data: ExplorerDragData) => {
  return getDraggedCollectionIDs(data).length > 0;
};

const isDraggingOnlyEntries = (data: ExplorerDragData) => {
  return hasDraggedEntries(data) && !hasDraggedCollections(data);
};

const isDraggingOnlyCollections = (data: ExplorerDragData) => {
  return hasDraggedCollections(data) && !hasDraggedEntries(data);
};

const isDraggingMixedContent = (data: ExplorerDragData) => {
  return hasDraggedEntries(data) && hasDraggedCollections(data);
};

const canOrderEntries = (data: ExplorerDragData) => {
  return isDraggingOnlyEntries(data);
};

const canOrderCollections = (data: ExplorerDragData) => {
  return isDraggingOnlyCollections(data);
};

const canChangeParent = (data: ExplorerDragData) => {
  return hasDraggedEntries(data) || hasDraggedCollections(data);
};

const hasTopmostCollectionTargetRestriction = (data: ExplorerDragData) => {
  return data.type === "multi" && hasDraggedCollections(data);
};

const canTargetCollection = (
  data: ExplorerDragData,
  collectionID: string,
  getCollectionAncestors: (collectionID: string) => string[]
) => {
  const collectionIDs = getDraggedCollectionIDs(data);

  if (toStringIDs(data.ids).includes(collectionID)) return false;
  if (collectionIDs.includes(collectionID)) return false;
  if (collectionIDs.some((draggedID) => getCollectionAncestors(collectionID).includes(draggedID))) {
    return false;
  }

  if (!hasTopmostCollectionTargetRestriction(data)) return true;

  return toStringIDs(data.collectionTargetIDs).includes(collectionID);
};

const createDragData = (input: {
  draggedID: string;
  draggedType: "entry" | "collection";
  selection: string[];
  splitContentIDs: (ids: string[]) => { entries: string[]; collections: string[] };
  flattenedOrder: string[];
  isCollection: (id: string) => boolean;
  getCollectionParentID: (collectionID: string) => string | null;
  getSiblingCollectionIDs: (parentID: string | null) => string[];
}) => {
  const selected = input.selection;
  const isDraggingSelected = selected.includes(input.draggedID);

  if (isDraggingSelected && selected.length > 1) {
    const { entries, collections } = input.splitContentIDs(selected);
    const order = input.flattenedOrder;
    const orderedCollections = [...collections].sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);

      return (
        (aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex) -
        (bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex)
      );
    });
    const topmostCollectionID = orderedCollections[0];
    const topmostCollectionIndex = topmostCollectionID ? order.indexOf(topmostCollectionID) : -1;
    const topmostCollectionParentID = topmostCollectionID
      ? input.getCollectionParentID(topmostCollectionID)
      : null;
    const getCollectionDepth = (collectionID: string | null) => {
      let depth = 0;
      let currentID = collectionID;
      const visited = new Set<string>();

      while (currentID && !visited.has(currentID)) {
        visited.add(currentID);
        depth += 1;
        currentID = input.getCollectionParentID(currentID);
      }

      return depth;
    };
    const siblingCollectionIDs = topmostCollectionID
      ? input.getSiblingCollectionIDs(topmostCollectionParentID)
      : [];
    const topmostCollectionDepth = getCollectionDepth(topmostCollectionID ?? null);
    const higherTreeCollectionIDs =
      topmostCollectionID && topmostCollectionIndex >= 0
        ? order.filter((id) => {
            return input.isCollection(id) && getCollectionDepth(id) < topmostCollectionDepth;
          })
        : [];

    return {
      type: "multi",
      ids: selected,
      entries,
      collections,
      topmostCollectionID,
      collectionTargetIDs: Array.from(
        new Set([...siblingCollectionIDs, ...higherTreeCollectionIDs])
      )
    };
  }

  return { type: input.draggedType, id: input.draggedID };
};

export {
  EXPLORER_GESTURE_PROPS,
  canOrderCollections,
  canOrderEntries,
  canChangeParent,
  canTargetCollection,
  createDragData,
  getExplorerDragPreviewOffset,
  getDraggedCollectionIDs,
  getDraggedEntryIDs,
  hasDraggedCollections,
  hasDraggedEntries,
  isDraggingMixedContent,
  isDraggingOnlyCollections,
  isDraggingOnlyEntries
};
export type { ExplorerDragData };
