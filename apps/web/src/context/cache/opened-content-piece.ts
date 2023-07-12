import { createSignal, createEffect, on, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { useAuthenticatedContext } from "#context/authenticated";
import { useClientContext, App } from "#context/client";
import { useUIContext } from "#context/ui";

interface UseOpenedContentPiece {
  setContentPiece<
    K extends keyof App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">
  >(
    keyOrObject: K | Partial<App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">>,
    value?: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">[K]
  ): void;
  loading(): boolean;
  contentPiece(): App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth"> | null;
}

const useOpenedContentPiece = (): UseOpenedContentPiece => {
  const { deletedTags } = useAuthenticatedContext();
  const { profile } = useAuthenticatedContext();
  const { storage, setStorage } = useUIContext();
  const { client } = useClientContext();
  const [loading, setLoading] = createSignal(true);
  const [state, setState] = createStore<{
    contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth"> | null;
  }>({ contentPiece: null });
  const fetchContentPiece = async (): Promise<void> => {
    setLoading(true);

    const { contentPieceId } = storage();

    if (contentPieceId) {
      try {
        const contentPiece = await client.contentPieces.get.query({
          id: contentPieceId
        });

        setState({ contentPiece });
      } catch (e) {
        setState({ contentPiece: null });
      }
    } else {
      setState({ contentPiece: null });
    }

    setLoading(false);
  };

  createEffect(
    on(
      () => storage().contentPieceId,
      (contentPieceId, previousContentPieceId) => {
        if (contentPieceId !== previousContentPieceId) {
          fetchContentPiece();
        }

        return contentPieceId;
      }
    )
  );
  createEffect(
    on(
      () => state.contentPiece?.contentGroupId,
      (contentGroupId, previousContentGroupId) => {
        if (!contentGroupId || contentGroupId === previousContentGroupId) return;

        const contentPiecesChanges = client.contentPieces.changes.subscribe(
          {
            contentGroupId
          },
          {
            onData({ data, action, userId = "" }) {
              if (action === "update") {
                const { tags, members, ...updateData } = data;
                const update: Partial<
                  App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">
                > = { ...updateData };

                if (data.members && userId !== profile()?.id) {
                  update.members = data.members.filter((member) => member.id !== profile()?.id);
                }

                if (data.tags && userId !== profile()?.id) {
                  update.tags = data.tags.filter((tag) => !deletedTags().includes(tag.id));
                }

                setState("contentPiece", update);
              } else if (action === "delete") {
                setState("contentPiece", null);
                setStorage((storage) => ({ ...storage, contentPieceId: undefined }));
              } else if (action === "move") {
                const move = {
                  ...data.contentPiece
                };

                if (data.contentPiece.tags) {
                  move.tags = data.contentPiece.tags.filter((tag) => {
                    return !deletedTags().includes(tag.id);
                  });
                }

                setState("contentPiece", move);
              }
            }
          }
        );

        onCleanup(() => {
          contentPiecesChanges.unsubscribe();
        });

        return contentGroupId;
      }
    )
  );
  createEffect(
    on(deletedTags, (deletedTags) => {
      if (state.contentPiece) {
        setState("contentPiece", "tags", (tags) => {
          return tags.filter((tag) => !deletedTags.includes(tag.id));
        });
      }
    })
  );

  return {
    loading,
    contentPiece: () => state.contentPiece,
    setContentPiece: (keyOrObject, value) => {
      if (typeof keyOrObject === "string" && value) {
        setState("contentPiece", keyOrObject, value);
      } else if (typeof keyOrObject === "object") {
        setState("contentPiece", keyOrObject);
      }
    }
  };
};

export { useOpenedContentPiece };
export type { UseOpenedContentPiece };
