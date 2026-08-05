import { createContext } from "solid-js";

const BlockMenuContext = createContext<{
  handleCopy(): boolean;
  handleDelete(): boolean;
  openMenu(reference?: HTMLElement): void;
}>({
  handleCopy: () => false,
  handleDelete: () => false,
  openMenu: () => {}
});

export { BlockMenuContext };
