import { Editor } from "./editor";
import { Component, createEffect, onCleanup } from "solid-js";
import clsx from "clsx";
import { useUIContext } from "#context";

const StandaloneEditorView: Component = () => {
  const { storage, setStorage } = useUIContext();

  createEffect(() => {
    if (storage().zenMode) {
      const escapeHandler = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          setStorage((storage) => ({ ...storage, zenMode: false }));
        }
      };

      document.addEventListener("keyup", escapeHandler);
      onCleanup(() => {
        document.removeEventListener("keyup", escapeHandler);
      });
    }
  });

  return (
    <div
      class={clsx(
        "relative overflow-y-auto overflow-x-hidden scrollbar-contrast h-full w-ful",
        storage().zenMode && "bg-gray-100 dark:bg-gray-800"
      )}
    >
      <div
        class={clsx(
          "flex flex-col justify-center items-center w-full p-2",
          storage().zenMode ? "items-center" : "items-start"
        )}
      >
        <Editor />
      </div>
    </div>
  );
};

export { StandaloneEditorView };
