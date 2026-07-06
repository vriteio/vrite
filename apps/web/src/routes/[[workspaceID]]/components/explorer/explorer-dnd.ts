type ExplorerDragData = Record<string | symbol, unknown>;

const getDraggedEntryIDs = (data: ExplorerDragData) => {
  if (data.type === "entry") return [data.id as string];
  if (data.type === "multi") return (data.entries as string[] | undefined) ?? [];

  return [];
};

const getDraggedCollectionIDs = (data: ExplorerDragData) => {
  if (data.type === "collection") return [data.id as string];
  if (data.type === "multi") return (data.collections as string[] | undefined) ?? [];

  return [];
};

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

  if ((data.ids as string[] | undefined)?.includes(collectionID)) return false;
  if (collectionIDs.includes(collectionID)) return false;
  if (collectionIDs.some((draggedID) => getCollectionAncestors(collectionID).includes(draggedID))) {
    return false;
  }

  if (!hasTopmostCollectionTargetRestriction(data)) return true;

  return ((data.collectionTargetIDs as string[] | undefined) ?? []).includes(collectionID);
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
  canOrderCollections,
  canOrderEntries,
  canChangeParent,
  canTargetCollection,
  createDragData,
  getDraggedCollectionIDs,
  getDraggedEntryIDs,
  hasDraggedCollections,
  hasDraggedEntries,
  isDraggingMixedContent,
  isDraggingOnlyCollections,
  isDraggingOnlyEntries
};
export type { ExplorerDragData };
