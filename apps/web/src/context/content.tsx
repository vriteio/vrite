import { client, Entry } from "#web/lib/client";
import {
  batch,
  createContext,
  createEffect,
  createResource,
  ParentComponent,
  useContext
} from "solid-js";
import { createStore } from "solid-js/store";

interface ContentTreeLevel {
  entries: string[];
  loading: boolean;
  moreToLoad: boolean;
}

const ContentContext = createContext<
  [
    {
      entries: Record<string, Entry | undefined>;
      contentTree: Record<string, ContentTreeLevel>;
    },
    {
      loadContentEntries(): Promise<void>;
      createEntry(): Promise<Entry | null>;
      updateEntry(id: string, entryUpdates: Partial<Omit<Entry, "id">>): Promise<void>;
      deleteEntries(ids: string[]): Promise<void>;
    }
  ]
>();
const ContentProvider: ParentComponent = (props) => {
  const [entries, setEntries] = createStore<Record<string, Entry | undefined>>({});
  const [contentTree, setContentTree] = createStore<Record<string, ContentTreeLevel>>({});
  const loadContentEntries = async () => {
    const contentTreeLevel = contentTree["*"];

    if (contentTreeLevel && (contentTreeLevel.loading || !contentTreeLevel.moreToLoad)) {
      return;
    }

    if (contentTreeLevel) {
      setContentTree("*", "loading", true);
    } else {
      setContentTree("*", {
        entries: [],
        loading: true,
        moreToLoad: true
      });
    }

    const lastLoadedEntryID = contentTreeLevel?.entries.at(-1);
    const lastLoadedEntry = lastLoadedEntryID ? entries[lastLoadedEntryID] : null;
    const { data: loadedEntries } = await client.entries.list.get({
      query: {
        ...(lastLoadedEntry && { lastOrder: lastLoadedEntry.order }),
        perPage: 50
      }
    });

    if (loadedEntries) {
      batch(() => {
        setEntries(
          loadedEntries.reduce(
            (entries, entry) => {
              entries[entry.id] = entry;

              return entries;
            },
            {} as Record<string, Entry>
          )
        );
        setContentTree("*", "entries", (entryIDs) => [
          ...entryIDs,
          ...loadedEntries.map((entry) => entry.id)
        ]);
        setContentTree("*", "loading", false);
        setContentTree("*", "moreToLoad", loadedEntries.length === 50);
      });
    }
  };
  const createEntry = async () => {
    const { data: entry } = await client.entries.index.post({});

    if (entry) {
      setEntries(entry.id, { id: entry.id, name: "" });
      setContentTree("*", "entries", (entryIDs) => [entry.id, ...entryIDs]);
    }

    return entry;
  };
  const updateEntry = async (id: string, entryUpdates: Partial<Omit<Entry, "id">>) => {
    setEntries(id, (currentEntry) => ({
      ...currentEntry,
      ...entryUpdates
    }));

    await client.entries({ id }).put({ ...entryUpdates });
  };
  const deleteEntries = async (ids: string[]) => {
    setEntries(ids, undefined);
    setContentTree("*", "entries", (entryIDs) => {
      return entryIDs.filter((entryID) => !ids.includes(entryID));
    });

    await client.entries.index.delete(undefined, {
      query: {
        ids
      }
    });
  };

  loadContentEntries();

  return (
    <ContentContext.Provider
      value={[
        {
          entries,
          contentTree
        },
        {
          loadContentEntries,
          createEntry,
          updateEntry,
          deleteEntries
        }
      ]}
    >
      {props.children}
    </ContentContext.Provider>
  );
};
const useContent = () => {
  return useContext(ContentContext)!;
};

export { ContentProvider, useContent };
