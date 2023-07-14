import { UseContentGroups, useContentGroups } from "./content-groups";
import { UseContentPieces, useContentPieces } from "./content-pieces";
import { UseOpenedContentPiece, useOpenedContentPiece } from "./opened-content-piece";
import { ParentComponent, createContext, createEffect, on, onCleanup, useContext } from "solid-js";

interface CacheContextData {
  useContentGroups(): UseContentGroups;
  useOpenedContentPiece(): UseOpenedContentPiece;
  useContentPieces(contentGroupId: string): UseContentPieces;
}

const CacheContext = createContext<CacheContextData>();
const CacheContextProvider: ParentComponent = (props) => {
  const useContentGroupsCache = useContentGroups();
  const useOpenedContentPieceCache = useOpenedContentPiece();

  let useContentPiecesCache: Record<string, UseContentPieces> = {};

  createEffect(
    on(useContentGroupsCache.contentGroups, (contentGroups) => {
      contentGroups.forEach(({ id }) => {
        useContentPiecesCache[id] = useContentPiecesCache[id] || useContentPieces(id);
      });
      onCleanup(() => {
        useContentPiecesCache = {};
      });
    })
  );

  return (
    <CacheContext.Provider
      value={{
        useOpenedContentPiece() {
          return useOpenedContentPieceCache;
        },
        useContentGroups() {
          return useContentGroupsCache;
        },
        useContentPieces(id: string) {
          return useContentPieces(id);
        }
      }}
    >
      {props.children}
    </CacheContext.Provider>
  );
};
const useCacheContext = (): CacheContextData => {
  return useContext(CacheContext)!;
};

export { CacheContextProvider, useCacheContext };
