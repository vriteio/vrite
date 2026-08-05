import { useTree } from "#web/components/tree";
import { useWorkspace } from "#web/context/workspace";
import {
  dropTargetForElements,
  monitorForElements
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { createSignal, onCleanup, onMount } from "solid-js";
import {
  canChangeParent,
  canOrderCollections,
  canOrderEntries,
  getDraggedCollectionIDs,
  getDraggedEntryIDs
} from "./explorer-dnd";

const useExplorerDrop = (element: () => HTMLElement | null) => {
  const [{ flattenedOrder }, { setSelection }] = useTree();
  const { content } = useWorkspace();
  const [isDraggedOver, setIsDraggedOver] = createSignal(false);
  const ordered = (ids: string[]) => {
    const idSet = new Set(ids);
    const visible = flattenedOrder().filter((id) => idSet.has(id));

    return [...visible, ...ids.filter((id) => !visible.includes(id))];
  };
  const moveEntries = (input: {
    entryIDs: string[];
    collectionID: string | null;
    targetEntryID?: string;
    edge?: "top" | "bottom" | null;
  }) => {
    const entryIDs = ordered(input.entryIDs);
    const orders = content.entries.getDropOrders({ ...input, entryIDs });
    entryIDs.forEach((id, index) =>
      content.entries.update({
        entryID: id,
        updates: {
          collectionID: input.collectionID ?? undefined,
          order: orders[index]
        }
      })
    );
  };
  const moveCollections = (input: {
    collectionIDs: string[];
    parentID: string | null;
    targetCollectionID?: string;
    edge?: "top" | "bottom" | null;
  }) => {
    const collectionIDs = ordered(input.collectionIDs);
    const start = content.collections.getDropIndex({ ...input, collectionIDs });
    collectionIDs.forEach((id, offset) =>
      content.collections.move({
        collectionID: id,
        parentID: input.parentID,
        index: start === undefined ? undefined : start + offset
      })
    );
  };
  const changesRootParent = (data: Record<string | symbol, unknown>) =>
    getDraggedEntryIDs(data).some(
      (id) => (content.entries.get({ entryID: id })?.collectionID ?? null) !== null
    ) ||
    getDraggedCollectionIDs(data).some(
      (id) => (content.collections.get({ collectionID: id })?.ancestors.at(-1) ?? null) !== null
    );

  onMount(() => {
    const unregisterMonitor = monitorForElements({
      onDrop({ source, location }) {
        if (content.readOnly()) return;
        const target = location.current.dropTargets[0];
        if (!target) return;

        const entries = getDraggedEntryIDs(source.data);
        const collections = getDraggedCollectionIDs(source.data);
        if (!entries.length && !collections.length) return;
        const data = target.data;
        let moved = false;

        if (data.type === "entry") {
          const targetEntryID = typeof data.id === "string" ? data.id : null;
          if (
            !targetEntryID ||
            collections.length ||
            (entries.length === 1 && entries[0] === targetEntryID)
          )
            return;
          if (!canOrderEntries(source.data)) return;
          moveEntries({
            entryIDs: entries,
            collectionID: typeof data.collectionID === "string" ? data.collectionID : null,
            targetEntryID,
            edge: extractClosestEdge(data) as "top" | "bottom" | null
          });
          moved = true;
        } else if (
          data.type === "collection" ||
          data.type === "collection-subtree" ||
          data.type === "collection-boundary" ||
          data.type === "entry-boundary"
        ) {
          const targetID = typeof data.id === "string" ? data.id : null;
          if (!targetID) return;
          const target = content.collections.get({ collectionID: targetID });
          const edge =
            data.type === "collection"
              ? (extractClosestEdge(data) as "top" | "bottom" | null)
              : null;
          if (
            entries.length &&
            (data.type === "collection-subtree" || data.type === "entry-boundary")
          ) {
            const last = canOrderEntries(source.data)
              ? content.tree.getLevel({ parentID: targetID }).entries().at(-1)?.id
              : undefined;
            moveEntries({
              entryIDs: entries,
              collectionID: targetID,
              targetEntryID: last,
              edge: last ? "bottom" : null
            });
            moved = true;
          }
          if (collections.length && data.type === "collection") {
            if (!edge || !target) return;
            const parentID = target.ancestors.at(-1) ?? null;
            moveCollections({
              collectionIDs: collections,
              parentID,
              ...(canOrderCollections(source.data) ? { targetCollectionID: targetID, edge } : {})
            });
            if (!canOrderCollections(source.data) && entries.length)
              moveEntries({ entryIDs: entries, collectionID: parentID });
            moved = true;
          } else if (
            collections.length &&
            (data.type === "collection-subtree" || data.type === "collection-boundary")
          ) {
            moveCollections({ collectionIDs: collections, parentID: targetID });
            moved = true;
          }
        } else if (data.type === "explorer") {
          if (entries.length) moveEntries({ entryIDs: entries, collectionID: null });
          if (collections.length) moveCollections({ collectionIDs: collections, parentID: null });
          moved = Boolean(entries.length || collections.length);
        }

        if (moved) setSelection([]);
      }
    });
    const dropElement = element();
    const unregisterTarget = dropElement
      ? dropTargetForElements({
          element: dropElement,
          getData: () => ({ type: "explorer", id: "" }),
          canDrop: ({ source }) => !content.readOnly() && canChangeParent(source.data),
          onDragEnter: ({ source }) => setIsDraggedOver(changesRootParent(source.data)),
          onDrag: ({ source }) => setIsDraggedOver(changesRootParent(source.data)),
          onDragLeave: () => setIsDraggedOver(false),
          onDrop: () => setIsDraggedOver(false)
        })
      : () => {};

    onCleanup(() => {
      unregisterMonitor();
      unregisterTarget();
    });
  });

  return { isDraggedOver };
};

export { useExplorerDrop };
