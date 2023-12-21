type ContentPiecePropertyKey = keyof App.ExtendedContentPieceWithAdditionalData<"coverWidth">;

interface UseContentGroups {
  contentGroups: Accessor<App.ContentGroup[]>;
  loading: Accessor<boolean>;
  refetch(ancestorId?: string): Promise<void>;
  setContentGroups(contentGroups: App.ContentGroup[]): void;
}

interface UseContentPieces {
  contentPieces(): Array<App.ExtendedContentPieceWithAdditionalData<"order">>;
  setContentPieces(contentPieces: Array<App.ExtendedContentPieceWithAdditionalData<"order">>): void;
  loading(): boolean;
  loadMore(): void;
  moreToLoad(): boolean;
}
interface UseOpenedContentPiece {
  activeVariant: Accessor<App.Variant | null>;
  setContentPiece<K extends ContentPiecePropertyKey>(
    keyOrObject: K | Partial<App.ExtendedContentPieceWithAdditionalData<"coverWidth">>,
    value?: App.ExtendedContentPieceWithAdditionalData<"coverWidth">[K]
  ): void;
  loading(): boolean;
  setActiveVariant(variant: App.Variant | null): void;
  contentPiece(): App.ExtendedContentPieceWithAdditionalData<"coverWidth"> | null;
}

const useOpenedContentPiece = (): UseOpenedContentPiece => {
  const [activeVariant, setActiveVariant] = createSignal<App.Variant | null>(null);
  const { deletedTags } = useAuthenticatedUserData();
  const { profile } = useAuthenticatedUserData();
  const { storage, setStorage } = useLocalStorage();
  const client = useClient();
  const [loading, setLoading] = createSignal(true);
  const [state, setState] = createStore<{
    contentPiece: App.ExtendedContentPieceWithAdditionalData<"coverWidth"> | null;
  }>({ contentPiece: null });
  const activeContentGroupId = (): string | null => {
    return storage().activeContentGroupId || null;
  };
  const setActiveContentGroupId = (contentGroupId: string): void => {
    setStorage((storage) => ({
      ...storage,
      activeContentGroupId: contentGroupId || undefined
    }));
  };
  const fetchContentPiece = async (): Promise<void> => {
    setLoading(true);

    const { contentPieceId } = storage();

    if (contentPieceId) {
      try {
        const contentPiece = await client.contentPieces.get.query({
          id: contentPieceId,
          variant: activeVariant()?.id
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
      [() => storage().contentPieceId, () => activeVariant()?.id || ""],
      ([contentPieceId, variantId], previous) => {
        const [previousContentPieceId, previousVariantId] = previous || [];

        if (contentPieceId !== previousContentPieceId || variantId !== previousVariantId) {
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
        if (!contentGroupId) return;

        const contentPiecesChanges = client.contentPieces.changes.subscribe(
          {
            contentGroupId
          },
          {
            onData(value) {
              const { data, action, userId = "" } = value;

              if (action === "update") {
                if (!("variantId" in value) || value.variantId === activeVariant()?.id) {
                  const { tags, members, ...updateData } = data;
                  const update: Partial<App.ExtendedContentPieceWithAdditionalData<"coverWidth">> =
                    { ...updateData };

                  if (data.members && userId !== profile()?.id) {
                    update.members = data.members.filter((member) => member.id !== profile()?.id);
                  }

                  if (data.tags && userId !== profile()?.id) {
                    update.tags = data.tags.filter((tag) => !deletedTags().includes(tag.id));
                  }

                  setState("contentPiece", update);
                }
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
    activeVariant,
    setActiveVariant,
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
const reorderContentGroup = (contentGroupId: string, index: number): void => {
  const newContentGroups = [...state.contentGroups];
  const contentGroupIndex = newContentGroups.findIndex((contentGroup) => {
    return contentGroup.id === contentGroupId;
  });
  const [contentGroup] = newContentGroups.splice(contentGroupIndex, 1);

  newContentGroups.splice(index, 0, contentGroup);
  setState({
    contentGroups: newContentGroups
  });
};
const moveContentGroup = (contentGroup: App.ContentGroup): void => {
  const newContentGroups = [...state.contentGroups];
  const index = newContentGroups.findIndex((newContentGroup) => {
    return newContentGroup.id === contentGroup.id;
  });

  if (index >= 0 && contentGroup.ancestors.at(-1) !== ancestorId()) {
    newContentGroups.splice(index, 1);
  } else if (index < 0 && contentGroup.ancestors.at(-1) === ancestorId()) {
    newContentGroups.push(contentGroup);
  }

  setState({
    contentGroups: newContentGroups
  });
};
