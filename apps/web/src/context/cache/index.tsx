import { UseOpenedContentPiece, useOpenedContentPiece } from "./opened-content-piece";
import { ParentComponent, createContext, useContext } from "solid-js";

interface CacheContextData {
  useOpenedContentPiece(): UseOpenedContentPiece;
}

const CacheContext = createContext<CacheContextData>();
const CacheContextProvider: ParentComponent = (props) => {
  const useOpenedContentPieceCache = useOpenedContentPiece();

  return (
    <CacheContext.Provider
      value={{
        useOpenedContentPiece() {
          return useOpenedContentPieceCache;
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
