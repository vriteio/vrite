import { ParentComponent, createContext, getOwner, runWithOwner, useContext } from "solid-js";

type CachingFunction = <T>(key: string, input: () => T) => T;

const CacheContext = createContext<CachingFunction>();
const CacheProvider: ParentComponent = (props) => {
  const cacheOwner = getOwner();
  const cache = new Map<string, any>();

  return (
    <CacheContext.Provider
      value={(key, input) => {
        return runWithOwner(cacheOwner, () => {
          if (cache.has(key)) {
            return cache.get(key);
          } else {
            cache.set(key, input());

            return cache.get(key);
          }
        })!;
      }}
    >
      {props.children}
    </CacheContext.Provider>
  );
};
const useCache = (): CachingFunction => {
  return useContext(CacheContext)!;
};

export { CacheProvider, useCache };
