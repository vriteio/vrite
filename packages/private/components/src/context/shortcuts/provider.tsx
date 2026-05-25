import { ParentComponent, createSignal, lazy } from "solid-js";
import { Shortcuts, ShortcutsContext } from "./context";

const ShortcutsHandler = lazy(async () => ({
  default: (await import("./shortcuts-handler")).ShortcutsHandler
}));
const ShortcutsProvider: ParentComponent = (props) => {
  const [shortcuts, setShortcuts] = createSignal<Shortcuts>({});
  const registerShortcuts = (shortcuts: Shortcuts) => {
    setShortcuts((currentShortcuts) => ({
      ...currentShortcuts,
      ...shortcuts
    }));

    return () => {
      setShortcuts((currentShortcuts) => {
        const newShortcuts: Shortcuts = {};

        Object.keys(currentShortcuts).forEach((key) => {
          if (!shortcuts[key]) {
            newShortcuts[key] = currentShortcuts[key];
          }
        });

        return newShortcuts;
      });
    };
  };

  return (
    <ShortcutsContext.Provider
      value={{
        shortcuts,
        registerShortcuts
      }}
    >
      <ShortcutsHandler />
      {props.children}
    </ShortcutsContext.Provider>
  );
};

export { ShortcutsProvider };
