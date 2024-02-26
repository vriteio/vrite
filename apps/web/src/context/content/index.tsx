import { ContentActions, createContentActions } from "./actions";
import { ContentLoader, createContentLoader } from "./loader";
import {
  createContext,
  createResource,
  InitializedResource,
  ParentComponent,
  useContext
} from "solid-js";
import { createEffect, on, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { useNavigate, useParams } from "@solidjs/router";
import { useClient, useLocalStorage, App } from "#context";

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
  variants: Record<string, App.Variant | undefined>;
  contentActions: ContentActions;
  contentLoader: ContentLoader;
  activeContentPieceId: InitializedResource<string | null>;
  activeContentGroupId(): string | null;
  activeVariantId(): string | null;
  expandedContentLevels(): string[];
  setActiveContentGroupId(contentGroupId: string | null): void;
  setActiveVariantId(variantId: string | null): void;
  expandContentLevel(contentGroupId: string): void;
  collapseContentLevel(contentGroupId: string): void;
}

const ContentDataContext = createContext<ContentDataContextData>();
const ContentDataProvider: ParentComponent = (props) => {
  const client = useClient();
  const params = useParams();
  const navigate = useNavigate();
  const { storage, setStorage } = useLocalStorage();
  const [variants, setVariants] = createStore<Record<string, App.Variant | undefined>>({});
  const [contentLevels, setContentLevels] = createStore<Record<string, ContentLevel | undefined>>(
    {}
  );
  const [contentGroups, setContentGroups] = createStore<
    Record<string, App.ContentGroup | undefined>
  >({});
  const [contentPieces, setContentPieces] = createStore<
    Record<string, App.ExtendedContentPieceWithAdditionalData<"order" | "coverWidth"> | undefined>
  >({});
  const activeVariantId = (): string | null => {
    return storage().activeVariantId || null;
  };
  const activeContentGroupId = (): string | null => {
    return storage().activeContentGroupId || null;
  };
  const [activeContentPieceId] = createResource(
    () => params.contentPiece,
    async (contentPieceParam) => {
      const idRegex = /^[a-f\d]{24}$/i;

      if (idRegex.test(contentPieceParam)) {
        return contentPieceParam;
      }

      const gitData = await client.git.config.query();
      const contentPiecesBySlug = await client.contentPieces.list.query({
        slug: params.contentPiece
      });

      if (contentPieceParam) {
        const [contentPieceBySlug] = contentPiecesBySlug;

        if (contentPieceBySlug) {
          return contentPieceBySlug.id;
        }

        const record = gitData.records.find((record) => {
          return record.path === contentPieceParam.split("/").filter(Boolean).join("/");
        });

        if (record) {
          return record?.contentPieceId || null;
        }

        return contentPieceParam || null;
      }

      return null;
    },
    { initialValue: params.contentPiece || null }
  );
  const setActiveVariantId = (variantId: string | null): void => {
    setStorage((storage) => ({
      ...storage,
      activeVariantId: variantId || undefined
    }));
  };
  const setActiveContentGroupId = (contentGroupId: string | null): void => {
    setStorage((storage) => ({
      ...storage,
      activeContentGroupId: contentGroupId || undefined
    }));
  };
  const expandedContentLevels = (): string[] => {
    if (storage().expandedContentLevels?.length === 0) {
      return [""];
    }

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
    setContentLevels,
    activeContentPieceId,
    activeContentGroupId,
    setActiveContentGroupId,
    collapseContentLevel
  });
  const contentLoader = createContentLoader({
    contentGroups,
    contentPieces,
    contentLevels,
    activeVariantId,
    setContentGroups,
    setContentPieces,
    setContentLevels
  });
  const contentGroupsSubscription = client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "move") {
        contentActions.moveContentGroup(data);
      } else if (action === "create") {
        contentActions.createContentGroup(data);
      } else if (action === "delete") {
        contentActions.deleteContentGroup(data);
      } else if (action === "update") {
        contentActions.updateContentGroup(data);
      } else if (action === "reorder") {
        contentActions.reorderContentGroup(data);
      }
    }
  });
  const variantsSubscription = client.variants.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "create") {
        setVariants(data.id, data);
      } else if (action === "update") {
        if (variants[data.id]) {
          setVariants(data.id, (variant) => ({
            ...variant,
            ...data
          }));
        }
      } else if (action === "delete") {
        setVariants(data.id, undefined);
      }
    }
  });
  const load = (): void => {
    setContentLevels(reconcile({}));
    setContentGroups(reconcile({}));
    setContentPieces(reconcile({}));
    expandedContentLevels().forEach(async (id) => {
      try {
        await contentLoader.loadContentLevel(id);
      } catch (e) {
        collapseContentLevel(id);
      }
    });
  };

  createEffect(
    on(activeVariantId, (newVariantId, previousVariantId) => {
      if (newVariantId === previousVariantId) return;

      load();
    })
  );
  createEffect(() => {
    for (const contentGroupId in contentGroups) {
      createEffect(
        on(
          () => contentGroups[contentGroupId],
          () => {
            const contentPiecesSubscription = client.contentPieces.changes.subscribe(
              { contentGroupId },
              {
                onData({ action, data }) {
                  if (action === "update") {
                    contentActions.updateContentPiece(data);
                  } else if (action === "create") {
                    contentActions.createContentPiece(data);
                  } else if (action === "delete") {
                    contentActions.deleteContentPiece(data);
                  } else if (action === "move") {
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
  createEffect(() => {
    const id = activeContentPieceId();
    const variantId = activeVariantId();

    if (!id || contentPieces[id]) return;

    client.contentPieces.get
      .query({
        id,
        variant: variantId || undefined
      })
      .then((contentPiece) => {
        setContentPieces(id, contentPiece);
      })
      .catch(() => {
        navigate(location.pathname.includes("editor") ? "/editor" : "/", { replace: true });
      });
  });
  onCleanup(() => {
    contentGroupsSubscription.unsubscribe();
    variantsSubscription.unsubscribe();
  });
  client.variants.list.query().then((variants) => {
    variants.forEach((variant) => {
      setVariants(variant.id, variant);
    });
  });

  return (
    <ContentDataContext.Provider
      value={{
        contentGroups,
        contentPieces,
        contentLevels,
        contentActions,
        contentLoader,
        variants,
        expandedContentLevels,
        activeContentGroupId,
        activeContentPieceId,
        activeVariantId,
        setActiveContentGroupId,
        setActiveVariantId,
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
