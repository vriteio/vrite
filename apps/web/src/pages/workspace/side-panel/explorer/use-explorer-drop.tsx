import { useTree } from "#web/components/tree";
import { useWorkspace } from "#web/context/workspace";
import { useNotify } from "#web/context/notifications";
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
import { type AffectedItem } from "#web/components/action-confirmation-dialog";
import { type PendingPublishingMove } from "./publishing-move-dialog";

interface ExplorerMoveInput {
  collectionIDs: string[];
  entryIDs: string[];
  parentID: string | null;
  execute(publish?: boolean): void;
}

const useExplorerDrop = (element: () => HTMLElement | null) => {
  const [{ flattenedOrder }, { setSelection }] = useTree();
  const { content, hasPermission } = useWorkspace();
  const notify = useNotify();
  const [isDraggedOver, setIsDraggedOver] = createSignal(false);
  const [pendingPublishingMove, setPendingPublishingMove] =
    createSignal<PendingPublishingMove | null>(null);
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
    publish?: boolean;
  }) => {
    const entryIDs = ordered(input.entryIDs);
    const orders = content.entries.getDropOrders({ ...input, entryIDs });
    entryIDs.forEach((id, index) =>
      content.entries.update({
        entryID: id,
        updates: {
          collectionID: input.collectionID ?? undefined,
          order: orders[index]
        },
        publish: input.publish
      })
    );
  };
  const moveCollections = (input: {
    collectionIDs: string[];
    parentID: string | null;
    targetCollectionID?: string;
    edge?: "top" | "bottom" | null;
    publish?: boolean;
  }) => {
    const collectionIDs = ordered(input.collectionIDs);
    const start = content.collections.getDropIndex({ ...input, collectionIDs });
    collectionIDs.forEach((id, offset) =>
      content.collections.move({
        collectionID: id,
        parentID: input.parentID,
        index: start === undefined ? undefined : start + offset,
        publish: input.publish
      })
    );
  };
  const isEntryPublishingEnabled = (entryID: string) => {
    const status = content.getEntryPublishingStatus(entryID);

    return status === "published" || status === "unpublished";
  };
  const getPublishingMoveDirection = (input: ExplorerMoveInput) => {
    const targetEnabled = input.parentID
      ? content.isCollectionPublishingEnabled(input.parentID)
      : false;
    const entryStates = input.entryIDs.map((entryID) => ({
      current: isEntryPublishingEnabled(entryID),
      next: targetEnabled
    }));
    const collectionStates = input.collectionIDs.map((collectionID) => ({
      current: content.isCollectionPublishingEnabled(collectionID),
      next: content.isCollectionPublishingExplicitlyEnabled(collectionID) || targetEnabled
    }));
    const states = [...entryStates, ...collectionStates];

    if (states.some((state) => !state.current && state.next)) return "enter";
    if (states.some((state) => state.current && !state.next)) return "leave";

    return null;
  };
  const getAffectedItems = (input: ExplorerMoveInput): AffectedItem[] => {
    const collections = input.collectionIDs.flatMap((collectionID) => {
      const collection = content.collections.get({ collectionID });

      return collection
        ? [
            {
              id: collection.id,
              icon: "i-material-symbols:folder-outline-rounded",
              label: collection.name
            }
          ]
        : [];
    });
    const entries = input.entryIDs.flatMap((entryID) => {
      const entry = content.entries.get({ entryID });

      return entry ? [{ id: entry.id, icon: "i-lucide:file-text", label: entry.name }] : [];
    });

    return [...collections, ...entries];
  };
  const crossesRestrictionBoundary = (input: ExplorerMoveInput) => {
    const targetBoundaryID = content.collections.getRestrictionBoundaryID({
      collectionID: input.parentID
    });
    const entryCrossesBoundary = input.entryIDs.some((entryID) => {
      const collectionID = content.entries.get({ entryID })?.collectionID ?? null;

      return content.collections.getRestrictionBoundaryID({ collectionID }) !== targetBoundaryID;
    });
    const collectionCrossesBoundary = input.collectionIDs.some((collectionID) => {
      return (
        content.collections.containsRestrictionRoot({ collectionID }) ||
        content.collections.getRestrictionBoundaryID({ collectionID }) !== targetBoundaryID
      );
    });

    return entryCrossesBoundary || collectionCrossesBoundary;
  };
  const submitMove = (input: ExplorerMoveInput) => {
    const direction = getPublishingMoveDirection(input);
    const execute = (publish?: boolean) => {
      input.execute(publish);
      setSelection([]);
    };

    if (crossesRestrictionBoundary(input) && !hasPermission("restricted_collections")) {
      notify({
        type: "error",
        text: "Permission to manage restricted collections is required for this move"
      });
      return;
    }

    if (!direction) {
      execute();
      return;
    }

    if (!hasPermission("publishing")) {
      notify({ type: "error", text: "Publishing permission is required for this move" });
      return;
    }

    setPendingPublishingMove({
      affected: getAffectedItems(input),
      direction,
      execute
    });
  };
  const closePublishingMove = () => setPendingPublishingMove(null);
  const confirmPublishingMove = (publish?: boolean) => {
    const move = pendingPublishingMove();

    if (!move) return;

    setPendingPublishingMove(null);
    move.execute(publish);
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
        if (data.type === "entry") {
          const targetEntryID = typeof data.id === "string" ? data.id : null;
          if (
            !targetEntryID ||
            collections.length ||
            (entries.length === 1 && entries[0] === targetEntryID)
          )
            return;
          if (!canOrderEntries(source.data)) return;
          const collectionID = typeof data.collectionID === "string" ? data.collectionID : null;

          submitMove({
            entryIDs: entries,
            collectionIDs: [],
            parentID: collectionID,
            execute: (publish) => {
              moveEntries({
                entryIDs: entries,
                collectionID,
                targetEntryID,
                edge: extractClosestEdge(data) as "top" | "bottom" | null,
                publish
              });
            }
          });
          return;
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
          if (collections.length && data.type === "collection") {
            if (!edge || !target) return;
            const parentID = target.ancestors.at(-1) ?? null;

            submitMove({
              entryIDs: canOrderCollections(source.data) ? [] : entries,
              collectionIDs: collections,
              parentID,
              execute: (publish) => {
                moveCollections({
                  collectionIDs: collections,
                  parentID,
                  publish,
                  ...(canOrderCollections(source.data)
                    ? { targetCollectionID: targetID, edge }
                    : {})
                });
                if (!canOrderCollections(source.data) && entries.length) {
                  moveEntries({ entryIDs: entries, collectionID: parentID, publish });
                }
              }
            });
            return;
          } else if (
            data.type === "collection-subtree" ||
            data.type === "collection-boundary" ||
            data.type === "entry-boundary"
          ) {
            const movingEntries =
              entries.length &&
              (data.type === "collection-subtree" || data.type === "entry-boundary")
                ? entries
                : [];
            const movingCollections =
              collections.length &&
              (data.type === "collection-subtree" || data.type === "collection-boundary")
                ? collections
                : [];

            if (!movingEntries.length && !movingCollections.length) return;

            const last = canOrderEntries(source.data)
              ? content.tree.getLevel({ parentID: targetID }).entries().at(-1)?.id
              : undefined;

            submitMove({
              entryIDs: movingEntries,
              collectionIDs: movingCollections,
              parentID: targetID,
              execute: (publish) => {
                if (movingEntries.length) {
                  moveEntries({
                    entryIDs: movingEntries,
                    collectionID: targetID,
                    targetEntryID: last,
                    edge: last ? "bottom" : null,
                    publish
                  });
                }

                if (movingCollections.length) {
                  moveCollections({
                    collectionIDs: movingCollections,
                    parentID: targetID,
                    publish
                  });
                }
              }
            });
            return;
          }
        } else if (data.type === "explorer") {
          submitMove({
            entryIDs: entries,
            collectionIDs: collections,
            parentID: null,
            execute: (publish) => {
              if (entries.length) moveEntries({ entryIDs: entries, collectionID: null, publish });
              if (collections.length) {
                moveCollections({ collectionIDs: collections, parentID: null, publish });
              }
            }
          });
        }
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

  return {
    closePublishingMove,
    confirmPublishingMove,
    isDraggedOver,
    pendingPublishingMove
  };
};

export { useExplorerDrop };
