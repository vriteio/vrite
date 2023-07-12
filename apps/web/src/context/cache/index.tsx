import { UseContentGroups, useContentGroups } from "./content-groups";
import { UseContentPieces, useContentPieces } from "./content-pieces";
import { UseOpenedContentPiece, useOpenedContentPiece } from "./opened-content-piece";
import { ParentComponent, createContext, onCleanup, useContext } from "solid-js";

interface CacheContextData {
  useContentGroups(): UseContentGroups;
  useOpenedContentPiece(): UseOpenedContentPiece;
  useContentPieces(contentGroupId: string): UseContentPieces;
}

const CacheContext = createContext<CacheContextData>();
const CacheContextProvider: ParentComponent = (props) => {
  let useContentGroupsCache: UseContentGroups | null = null;

  const useOpenedContentPieceCache = useOpenedContentPiece();

  let useContentPiecesCache: Record<string, UseContentPieces> = {};

  onCleanup(() => {
    useContentGroupsCache = null;
    useContentPiecesCache = {};
  });

  return (
    <CacheContext.Provider
      value={{
        useOpenedContentPiece() {
          return useOpenedContentPieceCache;
        },
        useContentGroups() {
          return useContentGroupsCache || (useContentGroupsCache = useContentGroups());
        },
        useContentPieces(contentGroupId: string) {
          return (
            useContentPiecesCache[contentGroupId] ||
            (useContentPiecesCache[contentGroupId] = useContentPieces(contentGroupId))
          );
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
