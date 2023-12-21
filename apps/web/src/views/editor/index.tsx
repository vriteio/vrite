import { Editor } from "./editor";
import { Component, createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import clsx from "clsx";
import { Loader } from "#components/primitives";
import { useAuthenticatedUserData, useContentData, useLocalStorage } from "#context";
import { createRef } from "#lib/utils";

const EditorView: Component = () => {
  const { contentPieces, activeContentPieceId } = useContentData();
  const { storage, setStorage } = useLocalStorage();
  const { workspaceSettings } = useAuthenticatedUserData();
  const [syncing, setSyncing] = createSignal(true);
  const [lastScrollTop, setLastScrollTop] = createSignal(0);
  const [reloaded, setReloaded] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);

  createEffect(
    on(
      workspaceSettings,
      () => {
        setSyncing(true);
        setLastScrollTop(scrollableContainerRef()?.scrollTop || 0);
      },
      { defer: true }
    )
  );
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
  createEffect(
    on(
      activeContentPieceId,
      () => {
        setSyncing(true);
      },
      { defer: true }
    )
  );
  setStorage((storage) => ({ ...storage, toolbarView: "editor" }));

  return (
    <>
      <Show
        when={activeContentPieceId()}
        fallback={
          <div class="flex items-center justify-center w-full h-full">
            {/* <Show when={!loading()}> */}
            <span class="text-2xl font-semibold text-gray-500 dark:text-gray-400">
              To edit, select an article in the dashboard
            </span>
            {/* </Show> */}
          </div>
        }
      >
        <div
          class={clsx(
            "flex-row flex relative overflow-y-auto overflow-x-hidden h-full scrollbar-contrast",
            storage().zenMode && "bg-gray-100 dark:bg-gray-800"
          )}
          ref={setScrollableContainerRef}
        >
          <div
            class={clsx(
              "flex flex-col justify-center p-2 md:mx-10 w-full md:w-[calc(100%-5rem)]",
              storage().zenMode ? "items-center" : "items-start"
            )}
          >
            <Show when={/* !loading() &&*/ workspaceSettings()} keyed>
              <Editor
                editedContentPiece={contentPieces[activeContentPieceId() || ""]!}
                reloaded={reloaded()}
                reload={async () => {
                  setReloaded(true);
                }}
                onLoad={() => {
                  setTimeout(() => {
                    scrollableContainerRef()?.scrollTo({ top: lastScrollTop() });
                  }, 0);
                  setSyncing(false);
                }}
              />
            </Show>
          </div>
        </div>
      </Show>
      <Show when={/* loading() || ()*/ activeContentPieceId() && syncing()}>
        <div class="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800 absolute top-0 left-0">
          <Loader />
        </div>
      </Show>
    </>
  );
};

export { EditorView };
