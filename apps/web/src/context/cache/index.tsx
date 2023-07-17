import { UseContentGroups, useContentGroups } from "./content-groups";
import { UseContentPieces, useContentPieces } from "./content-pieces";
import { UseOpenedContentPiece, useOpenedContentPiece } from "./opened-content-piece";
import { ParentComponent, createContext, getOwner, runWithOwner, useContext } from "solid-js";

interface CacheContextData {
  useOpenedContentPiece(): UseOpenedContentPiece;
  useContentGroups(): UseContentGroups;
  useContentPieces(contentGroupId: string): UseContentPieces;
}

const CacheContext = createContext<CacheContextData>();
const CacheContextProvider: ParentComponent = (props) => {
  const cacheOwner = getOwner();
  const useContentPiecesCache = new Map<string, UseContentPieces>();

  let useOpenedContentPieceCache: UseOpenedContentPiece | null = null;
  let useContentGroupsCache: UseContentGroups | null = null;

  return (
    <CacheContext.Provider
      value={{
        useOpenedContentPiece() {
          return runWithOwner(cacheOwner, () => {
            return (
              useOpenedContentPieceCache || (useOpenedContentPieceCache = useOpenedContentPiece())
            );
          })!;
        },
        useContentGroups() {
          return runWithOwner(cacheOwner, () => {
            return useContentGroupsCache || (useContentGroupsCache = useContentGroups());
          })!;
        },
        useContentPieces(contentGroupId) {
          return runWithOwner(cacheOwner, () => {
            if (!useContentPiecesCache.has(contentGroupId)) {
              useContentPiecesCache.set(contentGroupId, useContentPieces(contentGroupId));
            }

            return useContentPiecesCache.get(contentGroupId)!;
          })!;
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
