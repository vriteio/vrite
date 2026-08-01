import { ParentComponent, createSignal, lazy } from "solid-js";
import { Shortcuts, ShortcutsContext } from "./context";
import { nanoid } from "nanoid";

const ShortcutsHandler = lazy(async () => ({
  default: (await import("./shortcuts-handler")).ShortcutsHandler
}));
const ShortcutsProvider: ParentComponent = (props) => {
  const [shortcuts, setShortcuts] = createSignal<Shortcuts>({});
  const registrations = new Map<string, Shortcuts>();
  const updateShortcuts = () => {
    const handlers = new Map<string, Array<Shortcuts[string]>>();

    for (const registration of registrations.values()) {
      for (const [key, handler] of Object.entries(registration)) {
        handlers.set(key, [...(handlers.get(key) || []), handler]);
      }
    }

    setShortcuts(
      Object.fromEntries(
        Array.from(handlers, ([key, registeredHandlers]) => [
          key,
          (event: KeyboardEvent) => {
            for (let index = registeredHandlers.length - 1; index >= 0; index -= 1) {
              if (registeredHandlers[index](event)) return true;
            }

            return false;
          }
        ])
      )
    );
  };
  const registerShortcuts = (shortcuts: Shortcuts) => {
    const id = nanoid();

    registrations.set(id, shortcuts);
    updateShortcuts();

    return () => {
      if (registrations.delete(id)) updateShortcuts();
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
