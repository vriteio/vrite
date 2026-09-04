import { useTree } from "#web/components/tree";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
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
import { ExplorerMoveDialogs } from "./explorer-move-dialogs";
import {
  type ExplorerMoveInput,
  isSchemaMoveConfirmationRequired,
  requiresSchemaMoveConfirmation
} from "./explorer-schema-move";
const useExplorerDrop = (element: () => HTMLElement | null) => {
  const [{ flattenedOrder }, { setSelection }] = useTree();
  const { content } = useWorkspace();
  const notify = useNotify();
  const [isDraggedOver, setIsDraggedOver] = createSignal(false);
  const [pendingMove, setPendingMove] = createSignal<ExplorerMoveInput | null>(null);
  const [confirmingMove, setConfirmingMove] = createSignal(false);
  const ordered = (ids: string[]) => {
    const idSet = new Set(ids);
    const visible = flattenedOrder().filter((id) => idSet.has(id));

    return [...visible, ...ids.filter((id) => !visible.includes(id))];
  };
  const trackMigration = async (migrationID: string) => {
    while (true) {
      const details = await client.schemaMigrations.get({ id: migrationID });

      if (details.status === "completed") return;

      if (details.status === "failed") {
        throw new Error(details.error || "Schema migration failed");
      }

      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }
  };
  const moveEntries = async (input: {
    entryIDs: string[];
    collectionID: string | null;
    targetEntryID?: string;
    edge?: "top" | "bottom" | null;
    confirmedDataLoss: boolean;
  }) => {
    const entryIDs = ordered(input.entryIDs);
    const orders = content.entries.getDropOrders({ ...input, entryIDs });
    for (const [index, id] of entryIDs.entries()) {
      const result = await content.entries.update({
        entryID: id,
        updates: {
          collectionID: input.collectionID ?? undefined,
          order: orders[index]
        },
        confirmedDataLoss: input.confirmedDataLoss
      });

      if (result?.migrationID) {
        await trackMigration(result.migrationID);
      }
    }
  };
  const moveCollections = async (input: {
    collectionIDs: string[];
    parentID: string | null;
    targetCollectionID?: string;
    edge?: "top" | "bottom" | null;
    confirmedDataLoss: boolean;
  }) => {
    const collectionIDs = ordered(input.collectionIDs);
    const start = content.collections.getDropIndex({ ...input, collectionIDs });
    for (const [offset, id] of collectionIDs.entries()) {
      const result = await content.collections.move({
        collectionID: id,
        parentID: input.parentID,
        index: start === undefined ? undefined : start + offset,
        confirmedDataLoss: input.confirmedDataLoss
      });

      if (result?.migrationID) {
        await trackMigration(result.migrationID);
      }
    }
  };
  const hasMoveAccess = (input: ExplorerMoveInput) => {
    const canMoveEntries = input.entryIDs.every((entryID) => {
      const collectionID = content.entries.get({ entryID })?.collectionID ?? null;

      return (
        content.canEntry(collectionID, "entry:move") &&
        !content.hasActiveSchemaMigration(collectionID)
      );
    });
    const canMoveCollections = input.collectionIDs.every((collectionID) => {
      return (
        content.canCollection(collectionID, "collection:move") &&
        !content.hasActiveSchemaMigration(collectionID, true)
      );
    });
    const canAcceptEntries =
      input.entryIDs.length === 0 ||
      (content.canEntry(input.parentID, "entry:create") &&
        !content.hasActiveSchemaMigration(input.parentID));
    const canAcceptCollections =
      input.collectionIDs.length === 0 ||
      (content.canCollection(input.parentID, "collection:create-child") &&
        !content.hasActiveSchemaMigration(input.parentID));

    return canMoveEntries && canMoveCollections && canAcceptEntries && canAcceptCollections;
  };
  const finishMove = () => {
    setSelection([]);
  };
  const submitMove = (input: ExplorerMoveInput) => {
    if (!hasMoveAccess(input)) return;

    if (requiresSchemaMoveConfirmation(content, input)) {
      setPendingMove(input);
      return;
    }

    void input
      .execute(false)
      .then(finishMove)
      .catch((error) => {
        if (isSchemaMoveConfirmationRequired(error)) {
          setPendingMove(input);
          return;
        }

        console.error(error);
        notify({ type: "error", text: "Failed to move content" });
      });
  };
  const confirmMove = () => {
    const move = pendingMove();

    if (!move || confirmingMove()) return;

    setConfirmingMove(true);
    setPendingMove(null);
    void move
      .execute(true)
      .then(finishMove)
      .catch((error) => {
        console.error(error);
        notify({ type: "error", text: "Failed to move content" });
      })
      .finally(() => setConfirmingMove(false));
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
        if (content.offline() || content.syncing()) return;
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
            execute: async (confirmedDataLoss) => {
              await moveEntries({
                entryIDs: entries,
                collectionID,
                targetEntryID,
                edge: extractClosestEdge(data) as "top" | "bottom" | null,
                confirmedDataLoss
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
              execute: async (confirmedDataLoss) => {
                await moveCollections({
                  collectionIDs: collections,
                  parentID,
                  confirmedDataLoss,
                  ...(canOrderCollections(source.data)
                    ? { targetCollectionID: targetID, edge }
                    : {})
                });
                if (!canOrderCollections(source.data) && entries.length) {
                  await moveEntries({
                    entryIDs: entries,
                    collectionID: parentID,
                    confirmedDataLoss
                  });
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
              execute: async (confirmedDataLoss) => {
                if (movingEntries.length) {
                  await moveEntries({
                    entryIDs: movingEntries,
                    collectionID: targetID,
                    targetEntryID: last,
                    edge: last ? "bottom" : null,
                    confirmedDataLoss
                  });
                }

                if (movingCollections.length) {
                  await moveCollections({
                    collectionIDs: movingCollections,
                    parentID: targetID,
                    confirmedDataLoss
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
            execute: async (confirmedDataLoss) => {
              if (entries.length) {
                await moveEntries({
                  entryIDs: entries,
                  collectionID: null,
                  confirmedDataLoss
                });
              }
              if (collections.length) {
                await moveCollections({
                  collectionIDs: collections,
                  parentID: null,
                  confirmedDataLoss
                });
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
          canDrop: ({ source }) =>
            !content.offline() &&
            !content.syncing() &&
            (content.canEntry(null, "entry:create") ||
              content.canCollection(null, "collection:create-child")) &&
            canChangeParent(source.data),
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
    isDraggedOver,
    dialogs: () => (
      <ExplorerMoveDialogs
        confirming={confirmingMove()}
        move={pendingMove()}
        onCancel={() => setPendingMove(null)}
        onConfirm={confirmMove}
      />
    )
  };
};

export { useExplorerDrop };
