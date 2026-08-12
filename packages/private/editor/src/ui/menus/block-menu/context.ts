import { createContext, useContext } from "solid-js";
import type { BlockControlRange } from "#editor/ui/block-control-targeting";

interface BlockMenuContextValue {
  handleCopy(): boolean;
  handleDelete(): boolean;
  openMenu(reference?: HTMLElement): void;
  setTextMenuSelectionRange(range: BlockControlRange | null): void;
}

const BlockMenuContext = createContext<BlockMenuContextValue>({
  handleCopy: () => false,
  handleDelete: () => false,
  openMenu: () => {},
  setTextMenuSelectionRange: () => {}
});
const BlockMenuContextProvider = BlockMenuContext.Provider;

const useBlockMenuContext = () => {
  return useContext(BlockMenuContext)!;
};

export { BlockMenuContextProvider, useBlockMenuContext };
