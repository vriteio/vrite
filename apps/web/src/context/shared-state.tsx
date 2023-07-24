import {
  ParentComponent,
  createContext,
  createSignal,
  getOwner,
  runWithOwner,
  useContext
} from "solid-js";
import { createStore } from "solid-js/store";

interface SharedState {}

type SharedSignal = <K extends keyof SharedState>(
  key: K,
  initialValue?: Partial<SharedState>[K]
) => [() => Partial<SharedState>[K], (value: Partial<SharedState>[K]) => void];

const SharedStateContext = createContext<SharedSignal>();
const SharedStateProvider: ParentComponent = (props) => {
  const sharedSignals = new Map<string, any>();
  const owner = getOwner();
  const useSharedSignal = <K extends keyof SharedState>(
    key: K,
    initialValue?: Partial<SharedState>[K]
  ): [() => Partial<SharedState>[K], (value: Partial<SharedState>[K]) => void] => {
    return runWithOwner(owner, () => {
      if (!sharedSignals.has(key)) {
        const [state, setState] = createSignal<Partial<SharedState>[K]>(initialValue);

        sharedSignals.set(key, [state, setState]);
      }

      return sharedSignals.get(key);
    })!;
  };

  return (
    <SharedStateContext.Provider value={useSharedSignal}>
      {props.children}
    </SharedStateContext.Provider>
  );
};
const useSharedState = (): SharedSignal => {
  return useContext(SharedStateContext)!;
};

export { SharedStateProvider, useSharedState };
export type { SharedState };
