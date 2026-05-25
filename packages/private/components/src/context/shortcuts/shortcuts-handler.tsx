import { createEffect, onCleanup } from "solid-js";
import { tinykeys } from "tinykeys";
import { useShortcutsRegistry } from "./context";

const ShortcutsHandler = () => {
  const shortcuts = useShortcutsRegistry();

  createEffect(() => {
    const unregisterShortcuts = tinykeys(
      window,
      Object.fromEntries(
        Object.entries(shortcuts()).map(([key, handler]) => [
          key,
          (event: KeyboardEvent) => {
            const handled = handler(event);

            if (handled) {
              event.preventDefault();
              event.stopPropagation();
            }
          }
        ])
      )
    );

    onCleanup(() => {
      unregisterShortcuts();
    });
  });

  return <></>;
};

export { ShortcutsHandler };
