import { ContentActions, createContentActions } from "./actions";
import { ContentLoader, createContentLoader } from "./loader";
import { createContext, ParentComponent, useContext } from "solid-js";
import { createSignal, createEffect, on, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { useClient, useLocalStorage, App, useAuthenticatedUserData } from "#context";

interface ContentLevel {
  groups: string[];
  pieces: string[];
  moreToLoad: boolean;
  loading: boolean;
}

interface ContentDataContextData {
  contentGroups: Record<string, App.ContentGroup | undefined>;
  contentPieces: Record<
    string,
    App.ExtendedContentPieceWithAdditionalData<"order" | "coverWidth"> | undefined
  >;
  contentLevels: Record<string, ContentLevel | undefined>;
  contentActions: ContentActions;
  contentLoader: ContentLoader;
  activeContentGroupId(): string | null;
  activeContentPieceId(): string | null;
  expandedContentLevels(): string[];
  setActiveContentGroupId(contentGroupId: string | null): void;
  setActiveContentPieceId(contentPieceId: string | null): void;
  expandContentLevel(contentGroupId: string): void;
  collapseContentLevel(contentGroupId: string): void;
}

const ContentDataContext = createContext<ContentDataContextData>();
const ContentDataProvider: ParentComponent = (props) => {
  const client = useClient();
  const { profile } = useAuthenticatedUserData();
  const { storage, setStorage } = useLocalStorage();
  const [activeDraggableContentGroupId, setActiveDraggableContentGroupId] = createSignal<
    string | null
  >(null);
  const [activeDraggableContentPieceId, setActiveDraggableContentPieceId] = createSignal<
    string | null
  >(null);
  const [contentLevels, setContentLevels] = createStore<Record<string, ContentLevel | undefined>>(
    {}
  );
  const [contentGroups, setContentGroups] = createStore<
    Record<string, App.ContentGroup | undefined>
  >({});
  const [contentPieces, setContentPieces] = createStore<
    Record<string, App.ExtendedContentPieceWithAdditionalData<"order" | "coverWidth"> | undefined>
  >({});
  const activeContentGroupId = (): string | null => {
    return storage().activeContentGroupId || null;
  };
  const activeContentPieceId = (): string | null => {
    return storage().activeContentPieceId || null;
  };
  const setActiveContentGroupId = (contentGroupId: string | null): void => {
    setStorage((storage) => ({
      ...storage,
      activeContentGroupId: contentGroupId || undefined
    }));
  };
  const setActiveContentPieceId = (contentPieceId: string | null): void => {
    setStorage((storage) => ({
      ...storage,
      activeContentPieceId: contentPieceId || undefined
    }));
  };
  const expandedContentLevels = (): string[] => {
    return storage().expandedContentLevels || [""];
  };
  const expandContentLevel = (contentGroupId: string): void => {
    setStorage((storage) => ({
      ...storage,
      expandedContentLevels: [...new Set([...expandedContentLevels(), contentGroupId])]
    }));
  };
  const collapseContentLevel = (contentGroupId: string): void => {
    const levelsToClose = [contentGroupId];
    const addLevelsToClose = (parentId: string): void => {
      const level = contentLevels[parentId];

      if (!level) {
        return;
      }

      levelsToClose.push(...level.groups);
      level.groups.forEach((groupId) => addLevelsToClose(groupId));
    };

    addLevelsToClose(contentGroupId);
    setStorage((storage) => ({
      ...storage,
      expandedContentLevels:
        storage.expandedContentLevels?.filter((id) => !levelsToClose.includes(id)) || []
    }));
  };
  const contentActions = createContentActions({
    contentGroups,
    contentPieces,
    contentLevels,
    setContentGroups,
    setContentPieces,
    setContentLevels
  });
  const contentLoader = createContentLoader({
    contentGroups,
    contentPieces,
    contentLevels,
    setContentGroups,
    setContentPieces,
    setContentLevels
  });
  const contentGroupsSubscription = client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data, userId }) {
      if (action === "move") {
        contentActions.moveContentGroup(data);
      } else if (action === "create") {
        if (userId === profile()?.id) return;

        contentActions.createContentGroup(data);
      } else if (action === "delete") {
        contentActions.deleteContentGroup(data);
      } else if (action === "update") {
        if (userId === profile()?.id) return;

        contentActions.updateContentGroup(data);
      } else if (action === "reorder") {
        if (userId === profile()?.id) return;

        contentActions.reorderContentGroup(data);
      }
    }
  });

  createEffect(() => {
    for (const contentGroupId in contentGroups) {
      createEffect(
        on(
          () => contentGroups[contentGroupId],
          () => {
            const contentPiecesSubscription = client.contentPieces.changes.subscribe(
              { contentGroupId },
              {
                onData({ action, data, userId }) {
                  if (action === "update") {
                    if (userId === profile()?.id) return;

                    contentActions.updateContentPiece(data);
                  } else if (action === "create") {
                    contentActions.createContentPiece(data);
                  } else if (action === "delete") {
                    contentActions.deleteContentPiece(data);
                  } else if (action === "move") {
                    if (userId === profile()?.id) return;

                    contentActions.moveContentPiece(data);
                  }
                }
              }
            );

            onCleanup(() => {
              contentPiecesSubscription.unsubscribe();
            });
          }
        )
      );
    }
  });
  onCleanup(() => {
    contentGroupsSubscription.unsubscribe();
  });
  expandedContentLevels().forEach((id) => {
    try {
      contentLoader.loadContentLevel(id);
    } catch (e) {
      collapseContentLevel(id);
    }
  });

  return (
    <ContentDataContext.Provider
      value={{
        contentGroups,
        contentPieces,
        contentLevels,
        contentActions,
        contentLoader,
        expandedContentLevels,
        activeContentGroupId,
        activeContentPieceId,
        setActiveContentGroupId,
        setActiveContentPieceId,
        expandContentLevel,
        collapseContentLevel
      }}
    >
      {props.children}
    </ContentDataContext.Provider>
  );
};
const useContentData = (): ContentDataContextData => {
  return useContext(ContentDataContext)!;
};

export { ContentDataProvider, useContentData };
export type { ContentLevel };
