import { type Accessor, createContext, useContext } from "solid-js";

type Shortcuts = Record<string, (event: KeyboardEvent) => boolean>;

const ShortcutsContext = createContext<{
  shortcuts: Accessor<Shortcuts>;
  registerShortcuts(shortcuts: Shortcuts): () => void;
}>();
const useShortcuts = () => {
  return useContext(ShortcutsContext)!.registerShortcuts;
};
const useShortcutsRegistry = () => {
  return useContext(ShortcutsContext)!.shortcuts;
};

export { ShortcutsContext, useShortcuts, useShortcutsRegistry };
export type { Shortcuts };
