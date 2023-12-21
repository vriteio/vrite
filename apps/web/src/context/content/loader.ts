import { SetStoreFunction } from "solid-js/store";
import { App, ContentLevel, useClient } from "#context";

interface ContentActionsInput {
  contentGroups: Record<string, App.ContentGroup | undefined>;
  contentPieces: Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>;
  contentLevels: Record<string, ContentLevel | undefined>;
  setContentGroups: SetStoreFunction<Record<string, App.ContentGroup | undefined>>;
  setContentPieces: SetStoreFunction<
    Record<string, App.ExtendedContentPieceWithAdditionalData<"order"> | undefined>
  >;
  setContentLevels: SetStoreFunction<Record<string, ContentLevel | undefined>>;
}
interface ContentLoader {
  loadContentLevel(contentGroupId?: string, preload?: boolean): Promise<void>;
}

const createContentLoader = ({
  contentPieces,
  contentLevels,
  setContentGroups,
  setContentPieces,
  setContentLevels
}: ContentActionsInput): ContentLoader => {
  const client = useClient();
  const loadContentLevel: ContentLoader["loadContentLevel"] = async (contentGroupId, preload) => {
    const existingLevel = contentLevels[contentGroupId || ""];

    if (existingLevel && existingLevel.moreToLoad) {
      if (contentGroupId) {
        setContentLevels(contentGroupId, "loading", true);

        const level = {
          groups: [...existingLevel.groups],
          pieces: [...existingLevel.pieces],
          moreToLoad: false
        };
        const lastPieceId = existingLevel.pieces.at(-1);
        const lastPiece = contentPieces[lastPieceId || ""];

        if (!lastPiece) {
          setContentLevels(contentGroupId, level);

          return;
        }

        const newContentPieces = await client.contentPieces.list.query({
          contentGroupId,
          lastOrder: lastPiece.order
        });

        level.pieces.push(...newContentPieces.map((contentPiece) => contentPiece.id));
        newContentPieces.forEach((contentPiece) => {
          setContentPieces(contentPiece.id, contentPiece);
        });

        if (newContentPieces.length === 20) {
          level.moreToLoad = true;
        }

        setContentLevels(contentGroupId, level);
      }
    } else if (!existingLevel) {
      const level: ContentLevel = {
        groups: [],
        pieces: [],
        moreToLoad: false,
        loading: false
      };

      setContentLevels(contentGroupId || "", { ...level, loading: true });

      const contentGroups = await client.contentGroups.list.query({
        ancestor: contentGroupId || undefined
      });

      level.groups = contentGroups.map((contentGroup) => contentGroup.id);
      contentGroups.forEach((contentGroup) => {
        if (preload) {
          loadContentLevel(contentGroup.id);
        }

        setContentGroups(contentGroup.id, contentGroup);
      });

      if (contentGroupId) {
        const contentPieces = await client.contentPieces.list.query({
          contentGroupId
        });

        level.pieces = contentPieces.map((contentPiece) => contentPiece.id);
        contentPieces.forEach((contentPiece) => {
          setContentPieces(contentPiece.id, contentPiece);
        });

        if (contentPieces.length === 20) {
          level.moreToLoad = true;
        }
      }

      setContentLevels(contentGroupId || "", level);
    }
  };

  return {
    loadContentLevel
  };
};

export { createContentLoader };
export type { ContentLoader };
