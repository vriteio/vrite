import { UseContentGroups, useContentGroups } from "./content-groups";
import { UseContentPieces, useContentPieces } from "./content-pieces";
import { ParentComponent, createContext, onCleanup, useContext } from "solid-js";

interface CacheContextData {
  useContentGroups(): UseContentGroups;
  useContentPieces(contentGroupId: string): UseContentPieces;
}

const CacheContext = createContext<CacheContextData>();
const CacheContextProvider: ParentComponent = (props) => {
  let useContentGroupsCache: UseContentGroups | null = null;
  let useContentPiecesCache: Record<string, UseContentPieces> = {};

  onCleanup(() => {
    useContentGroupsCache = null;
    useContentPiecesCache = {};
  });

  return (
    <CacheContext.Provider
      value={{
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
