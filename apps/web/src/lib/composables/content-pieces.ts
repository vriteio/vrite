import { createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { App, useClient } from "#context/client";
import { useNotifications } from "#context/notifications";

interface UseContentPieces {
  contentPieces(): Array<App.ExtendedContentPieceWithAdditionalData<"locked" | "order">>;
  setContentPieces(
    contentPieces: Array<App.ExtendedContentPieceWithAdditionalData<"locked" | "order">>
  ): void;
  loading(): boolean;
  loadMore(): void;
}

const useContentPieces = (contentGroupId: string): UseContentPieces => {
  const { notify } = useNotifications();
  const client = useClient();
  const [loading, setLoading] = createSignal(false);
  const [moreToLoad, setMoreToLoad] = createSignal(true);
  const [state, setState] = createStore<{
    contentPieces: Array<App.ExtendedContentPieceWithAdditionalData<"locked" | "order">>;
  }>({
    contentPieces: []
  });
  const loadMore = (): void => {
    const lastOrder = state.contentPieces[state.contentPieces.length - 1]?.order;

    if (loading() || !moreToLoad()) return;

    setLoading(true);
    client.contentPieces.list.query({ contentGroupId, perPage: 20, lastOrder }).then((data) => {
      setLoading(false);
      setState("contentPieces", (contentPieces) => [...contentPieces, ...data]);
      setMoreToLoad(data.length === 20);
    });
  };
  const contentPiecesChanges = client.contentPieces.changes.subscribe(
    { contentGroupId },
    {
      onData(value) {
        const { action, data } = value;

        switch (action) {
          case "delete":
            setState("contentPieces", (contentPieces) => {
              return contentPieces.filter((contentPiece) => {
                return contentPiece.id !== data.id;
              });
            });
            notify({ text: "Content piece deleted", type: "success" });
            break;
          case "create":
            setState("contentPieces", (contentPieces) => [data, ...contentPieces]);
            break;
          case "update":
            if (!("variantId" in value)) {
              setState(
                "contentPieces",
                state.contentPieces.findIndex((contentPiece) => contentPiece.id === data.id),
                (contentPiece) => {
                  return { ...contentPiece, ...data };
                }
              );
            }

            break;
          case "move":
            setState("contentPieces", (contentPieces) => {
              const currentIndex = contentPieces.findIndex(
                (contentPiece) => data.contentPiece.id === contentPiece.id
              );

              if (currentIndex >= 0) {
                if (contentGroupId === data.contentPiece.contentGroupId) {
                  const newContentPieces = [...contentPieces];

                  newContentPieces.splice(currentIndex, 1);

                  const previousReferenceIndex = newContentPieces.findIndex((contentPieces) => {
                    return contentPieces.id === data.previousReferenceId;
                  });

                  if (previousReferenceIndex >= 0) {
                    newContentPieces.splice(previousReferenceIndex, 0, data.contentPiece);
                  } else {
                    const nextReferenceIndex = newContentPieces.findIndex((contentPieces) => {
                      return contentPieces.id === data.nextReferenceId;
                    });

                    if (nextReferenceIndex >= 0) {
                      newContentPieces.splice(nextReferenceIndex + 1, 0, data.contentPiece);
                    } else if (!data.previousReferenceId && !data.nextReferenceId) {
                      newContentPieces.push(data.contentPiece);
                    }
                  }

                  return newContentPieces;
                }

                return contentPieces.filter((contentPiece) => {
                  return contentPiece.id !== data.contentPiece.id;
                });
              } else if (contentGroupId === data.contentPiece.contentGroupId) {
                const newContentPieces = [...contentPieces];
                const previousReferenceIndex = newContentPieces.findIndex((contentPieces) => {
                  return contentPieces.id === data.previousReferenceId;
                });

                if (previousReferenceIndex >= 0) {
                  newContentPieces.splice(previousReferenceIndex, 0, data.contentPiece);
                } else {
                  const nextReferenceIndex = newContentPieces.findIndex((contentPieces) => {
                    return contentPieces.id === data.nextReferenceId;
                  });

                  if (nextReferenceIndex >= 0) {
                    newContentPieces.splice(nextReferenceIndex + 1, 0, data.contentPiece);
                  } else if (!data.previousReferenceId && !data.nextReferenceId) {
                    newContentPieces.push(data.contentPiece);
                  }
                }

                return newContentPieces;
              }

              return contentPieces;
            });
            break;
        }
      }
    }
  );

  loadMore();
  onCleanup(() => {
    contentPiecesChanges.unsubscribe();
  });

  return {
    contentPieces: () => state.contentPieces,
    setContentPieces: (contentPieces) => setState("contentPieces", contentPieces),
    loading,
    loadMore
  };
};

export { useContentPieces };
export type { UseContentPieces };
