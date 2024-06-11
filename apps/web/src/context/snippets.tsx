import {
  Accessor,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  ParentComponent,
  useContext
} from "solid-js";
import { useLocation, useParams } from "@solidjs/router";
import { App, useAuthenticatedUserData, useClient } from "#context";

interface SnippetsActions {
  createSnippet(snippet: App.Snippet): void;
  updateSnippet(snippet: Pick<App.Snippet, "id"> & Partial<App.Snippet>): void;
  deleteSnippet(snippet: Pick<App.Snippet, "id">): void;
}
interface SnippetsDataContextData {
  snippets: Accessor<App.Snippet[]>;
  activeSnippetId: Accessor<string | null>;
  loading: Accessor<boolean>;
  snippetsActions: SnippetsActions;
}

const SnippetsDataContext = createContext<SnippetsDataContextData>();
const SnippetsDataProvider: ParentComponent = (props) => {
  const location = useLocation();
  const params = useParams();
  const client = useClient();
  const { workspace } = useAuthenticatedUserData();
  const [snippets, setSnippets] = createSignal<App.Snippet[]>([]);
  const [loading, setLoading] = createSignal(false);
  const load = async (): Promise<void> => {
    setLoading(true);

    const loadedSnippets = await client.snippets.list.query();

    setSnippets((snippets) => [...loadedSnippets, ...snippets]);
    setLoading(false);
  };
  const activeSnippetId = (): string | null => {
    if (location.pathname.startsWith("/snippet")) return params.snippetId;

    return null;
  };
  const snippetsActions: SnippetsActions = {
    createSnippet(snippet) {
      const existingSnippet = snippets().find(
        (existingSnippet) => existingSnippet.id === snippet.id
      );

      if (existingSnippet) {
        return this.updateSnippet(snippet);
      }

      setSnippets((snippets) => [snippet, ...snippets]);
    },
    updateSnippet(snippet) {
      setSnippets((snippets) => {
        const index = snippets.findIndex((existingSnippet) => existingSnippet.id === snippet.id);
        const existingSnippet = snippets[index];

        if (index === -1) {
          return snippets;
        }

        return [
          ...snippets.slice(0, index),
          { ...existingSnippet, ...snippet },
          ...snippets.slice(index + 1)
        ];
      });
    },
    deleteSnippet(snippet) {
      setSnippets((snippets) => {
        return snippets.filter((filteredSnippet) => filteredSnippet.id !== snippet.id);
      });
    }
  };
  const snippetsSubscription = client.snippets.changes.subscribe(
    {
      workspaceId: workspace()!.id || ""
    },
    {
      onData({ action, data }) {
        if (action === "create") {
          snippetsActions.createSnippet(data);
        } else if (action === "update") {
          snippetsActions.updateSnippet(data);
        } else if (action === "delete") {
          snippetsActions.deleteSnippet(data);
        }
      }
    }
  );

  onMount(() => {
    load();
  });
  onCleanup(() => {
    snippetsSubscription.unsubscribe();
  });

  return (
    <SnippetsDataContext.Provider
      value={{
        activeSnippetId,
        snippets,
        loading,
        snippetsActions
      }}
    >
      {props.children}
    </SnippetsDataContext.Provider>
  );
};
const useSnippetsData = (): SnippetsDataContextData => {
  return useContext(SnippetsDataContext)!;
};

export { SnippetsDataProvider, useSnippetsData };
