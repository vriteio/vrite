import { type Accessor, createContext, useContext } from "solid-js";
import type { KeybindingFilter } from "tinykeys";

type Shortcuts = Record<string, (event: KeyboardEvent) => boolean>;
interface ShortcutRegistrationOptions {
  ignore?: KeybindingFilter;
}

const ShortcutsContext = createContext<{
  shortcuts: Accessor<Shortcuts>;
  registerShortcuts(shortcuts: Shortcuts, options?: ShortcutRegistrationOptions): () => void;
}>();
const useShortcuts = () => {
  return useContext(ShortcutsContext)!.registerShortcuts;
};
const useShortcutsRegistry = () => {
  return useContext(ShortcutsContext)!.shortcuts;
};

export { ShortcutsContext, useShortcuts, useShortcutsRegistry };
export type { ShortcutRegistrationOptions, Shortcuts };
