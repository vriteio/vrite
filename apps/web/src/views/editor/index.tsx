import { Editor } from "./editor";
import {
  Component,
  createEffect,
  createResource,
  createSignal,
  on,
  onCleanup,
  Show
} from "solid-js";
import clsx from "clsx";
import { Loader } from "#components/primitives";
import { useAuthenticatedContext, useCacheContext, useClientContext, useUIContext } from "#context";
import { createRef } from "#lib/utils";

const EditorView: Component = () => {
  const { useOpenedContentPiece } = useCacheContext();
  const { client } = useClientContext();
  const { storage, setStorage, references } = useUIContext();
  const { workspaceSettings } = useAuthenticatedContext();
  const [syncing, setSyncing] = createSignal(true);
  const [lastScrollTop, setLastScrollTop] = createSignal(0);
  const [reloaded, setReloaded] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const editedArticleId = (): string => storage().contentPieceId || "";
  /* const [contentPiece, { refetch }] = createResource(editedArticleId, async (editedArticleId) => {
    if (editedArticleId) {
      setReloaded(false);

      return client.contentPieces.get.query({
        id: editedArticleId,
        variant: references.activeVariant?.id
      });
    }

    return null;
  });*/
  const { contentPiece, loading } = useOpenedContentPiece();

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

  return (
    <>
      <Show
        when={contentPiece()}
        fallback={
          <div class="flex items-center justify-center w-full h-full">
            <Show when={!loading()}>
              <span class="text-2xl font-semibold text-gray-500 dark:text-gray-400">
                To edit, select an article in the dashboard
              </span>
            </Show>
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
            <Show when={!loading() && workspaceSettings()} keyed>
              <Editor
                editedContentPiece={contentPiece()!}
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
      <Show when={loading() || (contentPiece() && syncing())}>
        <div class="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800 absolute top-0 left-0">
          <Loader />
        </div>
      </Show>
    </>
  );
};

export { EditorView };
