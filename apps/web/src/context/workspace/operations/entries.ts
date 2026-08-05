import { type Entry, client } from "#web/lib/api";
import { generateUUID, toEntryID } from "#web/lib/primitives";
import { LexoRank } from "lexorank";
import { type WorkspaceContentOperationsInput } from "./types";
import { untrack } from "solid-js";

const createEntryOperations = (input: WorkspaceContentOperationsInput) => {
  const { entriesCollection } = input;
  const pendingCreates = new Map<string, Promise<unknown>>();
  const sortEntries = (entries: Entry[]) => {
    return [...entries].sort((a, b) => b.order.localeCompare(a.order) || a.id.localeCompare(b.id));
  };
  const getEntriesInCollection = (collectionID: string | null) => {
    return sortEntries(
      entriesCollection()
        .find(collectionID === null ? { collectionID: { $exists: false } } : { collectionID }, {
          sort: {
            order: -1
          }
        })
        .fetch()
    );
  };
  const getEntry = (id: string) => {
    return untrack(() => entriesCollection().findOne({ id }));
  };
  const applyEntryCreate = (entry: Entry) => {
    const entries = entriesCollection();
    const current = entries.findOne({ id: entry.id });

    entries.replaceOne({ id: entry.id }, { ...entry, ...(current || {}) }, { upsert: true });
  };
  const applyEntryUpdate = (entryID: string, props: Partial<Entry>) => {
    entriesCollection().updateOne({ id: entryID }, { $set: props });
  };
  const applyEntryDelete = (entryIDs: string[]) => {
    entriesCollection().removeMany({ id: { $in: entryIDs } });
  };
  const getEntryDropOrders = (input: {
    collectionID: string | null;
    targetEntryID?: string;
    edge?: "top" | "bottom" | null;
    entryIDs: string[];
  }) => {
    const movingEntryIDs = new Set(input.entryIDs);
    const siblings = getEntriesInCollection(input.collectionID).filter((entry) => {
      return !movingEntryIDs.has(entry.id);
    });
    const targetIndex = input.targetEntryID
      ? siblings.findIndex((entry) => entry.id === input.targetEntryID)
      : -1;
    const insertIndex =
      targetIndex === -1 ? 0 : input.edge === "bottom" ? targetIndex + 1 : targetIndex;
    const before = siblings[insertIndex - 1];
    const after = siblings[insertIndex];
    const orders = new Array<string>(input.entryIDs.length);
    let lowerBoundary = after ? LexoRank.parse(after.order) : null;
    const upperBoundary = before ? LexoRank.parse(before.order) : null;

    for (let index = input.entryIDs.length - 1; index >= 0; index -= 1) {
      const nextRank = upperBoundary
        ? lowerBoundary
          ? lowerBoundary.between(upperBoundary)
          : upperBoundary.genPrev()
        : lowerBoundary
          ? lowerBoundary.genNext()
          : LexoRank.middle();

      orders[index] = nextRank.toString();
      lowerBoundary = nextRank;
    }

    return orders;
  };
  const createEntry = (collectionID?: string): Entry | undefined => {
    const firstSibling = getEntriesInCollection(collectionID ?? null)[0];
    const entry: Entry = {
      id: toEntryID(generateUUID()),
      order: firstSibling
        ? `${LexoRank.parse(firstSibling.order).genNext()}`
        : `${LexoRank.middle()}`,
      name: "Untitled",
      collectionID
    };

    applyEntryCreate(entry);

    const createRequest = client.entries.create(entry).then((createdEntry) => {
      const current = entriesCollection().findOne({ id: entry.id });

      if (current?.order === entry.order && current.collectionID === entry.collectionID) {
        applyEntryUpdate(entry.id, { order: createdEntry.order });
      }
    });

    pendingCreates.set(entry.id, createRequest);
    createRequest
      .catch(() => {
        applyEntryDelete([entry.id]);
      })
      .finally(() => {
        pendingCreates.delete(entry.id);
      });

    return entry;
  };
  const updateEntry = (entryID: string, props: Partial<Entry>) => {
    const entries = entriesCollection();
    const original = entries.findOne({ id: entryID });

    if (!original) return;

    const updated = { ...original, ...props };
    const apiCalls: Array<Promise<unknown>> = [];
    const afterCreate = <T>(request: () => Promise<T>) => {
      const pendingCreate = pendingCreates.get(entryID);

      return pendingCreate ? pendingCreate.then(request) : request();
    };

    if ("name" in props) {
      apiCalls.push(afterCreate(() => client.entries.update({ id: entryID, name: updated.name })));
    }

    if ("order" in props || "collectionID" in props) {
      apiCalls.push(
        afterCreate(() =>
          client.entries
            .move({
              id: entryID,
              order: updated.order,
              collectionID: updated.collectionID ?? null
            })
            .then(({ order }) => {
              const current = entries.findOne({ id: entryID });

              if (current?.order === updated.order && order !== updated.order) {
                applyEntryUpdate(entryID, { order });
              }
            })
        )
      );
    }

    if (apiCalls.length === 0) return;

    applyEntryUpdate(entryID, props);

    Promise.all(apiCalls).catch(() => {
      if (!entries.findOne({ id: entryID })) return;

      entries.replaceOne({ id: entryID }, original, { upsert: true });
    });
  };
  const deleteEntries = (entryIDs: string[]) => {
    if (entryIDs.length === 0) return;

    const entries = entriesCollection();
    const deletedEntries = entryIDs.flatMap((id) => {
      const entry = entries.findOne({ id });

      return entry ? [entry] : [];
    });

    applyEntryDelete(entryIDs);

    client.entries.delete({ ids: entryIDs }).catch(() => {
      entries.batch(() => {
        for (const entry of deletedEntries) {
          entries.replaceOne({ id: entry.id }, entry, { upsert: true });
        }
      });
    });
  };

  return {
    sortEntries,
    getEntriesInCollection,
    getEntry,
    applyEntryCreate,
    applyEntryUpdate,
    applyEntryDelete,
    getEntryDropOrders,
    createEntry,
    updateEntry,
    deleteEntries
  };
};

export { createEntryOperations };
