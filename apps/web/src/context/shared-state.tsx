import {
  Accessor,
  ParentComponent,
  Setter,
  createContext,
  createSignal,
  getOwner,
  runWithOwner,
  useContext
} from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";

interface SharedState {}

type SharedSignal = <K extends keyof SharedState>(
  key: K,
  initialValue?: SharedState[K]
) => [Accessor<SharedState[K]>, Setter<SharedState[K]>];
type SharedStore = <K extends keyof SharedState>(
  key: K,
  initialValue?: Extract<SharedState[K], object>
) => [SharedState[K], SetStoreFunction<SharedState[K]>];

interface SharedStateContextData {
  useSharedSignal: SharedSignal;
  useSharedStore: SharedStore;
}

const SharedStateContext = createContext<SharedStateContextData>();
const SharedStateProvider: ParentComponent = (props) => {
  const sharedSignals = new Map<string, any>();
  const sharedStores = new Map<string, any>();
  const owner = getOwner();
  const useSharedSignal: SharedSignal = (key, initialValue) => {
    return runWithOwner(owner, () => {
      if (!sharedSignals.has(key)) {
        const [state, setState] = createSignal(initialValue);

        sharedSignals.set(key, [state, setState]);
      }

      return sharedSignals.get(key);
    })!;
  };
  const useSharedStore: SharedStore = (key, initialValue) => {
    return runWithOwner(owner, () => {
      if (!sharedStores.has(key)) {
        const [state, setState] = createStore(initialValue);

        sharedStores.set(key, [state, setState]);
      }

      return sharedStores.get(key);
    })!;
  };

  return (
    <SharedStateContext.Provider value={{ useSharedSignal, useSharedStore }}>
      {props.children}
    </SharedStateContext.Provider>
  );
};
const useSharedState = (): SharedStateContextData => {
  return useContext(SharedStateContext)!;
};

export { SharedStateProvider, useSharedState };
export type { SharedState };
