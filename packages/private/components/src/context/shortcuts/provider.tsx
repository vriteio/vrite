import { type ParentComponent, createSignal, lazy } from "solid-js";
import { type ShortcutRegistrationOptions, type Shortcuts, ShortcutsContext } from "./context";
import { nanoid } from "nanoid";
import { defaultKeybindingsHandlerIgnore } from "tinykeys";

interface ShortcutRegistration {
  options?: ShortcutRegistrationOptions;
  shortcuts: Shortcuts;
}

const ShortcutsHandler = lazy(async () => ({
  default: (await import("./shortcuts-handler")).ShortcutsHandler
}));
const ShortcutsProvider: ParentComponent = (props) => {
  const [shortcuts, setShortcuts] = createSignal<Shortcuts>({});
  const registrations = new Map<string, ShortcutRegistration>();
  const updateShortcuts = () => {
    const handlers = new Map<string, ShortcutRegistration[]>();

    for (const registration of registrations.values()) {
      for (const key of Object.keys(registration.shortcuts)) {
        handlers.set(key, [...(handlers.get(key) || []), registration]);
      }
    }

    setShortcuts(
      Object.fromEntries(
        Array.from(handlers, ([key, registeredShortcuts]) => [
          key,
          (event: KeyboardEvent) => {
            for (let index = registeredShortcuts.length - 1; index >= 0; index -= 1) {
              const registration = registeredShortcuts[index];
              const ignore = registration.options?.ignore ?? defaultKeybindingsHandlerIgnore;

              if (!ignore(event) && registration.shortcuts[key](event)) return true;
            }

            return false;
          }
        ])
      )
    );
  };
  const registerShortcuts = (shortcuts: Shortcuts, options?: ShortcutRegistrationOptions) => {
    const id = nanoid();

    registrations.set(id, { shortcuts, options });
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
