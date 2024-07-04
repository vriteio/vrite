import { Editor } from "./editor";
import clsx from "clsx";
import { Component, createSignal, createEffect, on, Show } from "solid-js";
import { Loader } from "#components/primitives";
import { createRef } from "#lib/utils";
import {
  useContentData,
  useLocalStorage,
  useExtensions,
  useAuthenticatedUserData,
  hasPermission,
  App,
  useMeta
} from "#context";

const ContentPieceEditorView: Component = () => {
  const { contentPieces, activeContentPieceId, activeVariantId } = useContentData();
  const { storage, setStorage } = useLocalStorage();
  const { loadingInstalledExtensions, installedExtensions } = useExtensions();
  const { workspaceSettings } = useAuthenticatedUserData();
  const { setMetaTitle } = useMeta();
  const [syncing, setSyncing] = createSignal(true);
  const [lastScrollTop, setLastScrollTop] = createSignal(0);
  const [reloaded, setReloaded] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const docName = (): string => {
    return `${activeContentPieceId() || ""}${activeVariantId() ? ":" : ""}${activeVariantId() || ""}`;
  };
  const contentPiece = ():
    | App.ExtendedContentPieceWithAdditionalData<"order" | "coverWidth">
    | undefined => contentPieces[activeContentPieceId() || ""];

  createEffect(
    on(
      [workspaceSettings],
      () => {
        setSyncing(true);
        setLastScrollTop(scrollableContainerRef()?.scrollTop || 0);
      },
      { defer: true }
    )
  );
  createEffect(
    on(
      installedExtensions,
      (_installedExtensions, _previousInstalledExtensions, previousLoading = true) => {
        const loading = loadingInstalledExtensions();

        if (!loading && !previousLoading) {
          setSyncing(true);
          setLastScrollTop(scrollableContainerRef()?.scrollTop || 0);
        }

        return loading;
      },
      { defer: true }
    )
  );
  setStorage((storage) => ({ ...storage, toolbarView: "editor" }));
  createEffect(
    on(contentPiece, (newContentPiece, previousContentPiece) => {
      if (newContentPiece !== previousContentPiece) {
        setSyncing(true);
      }
    })
  );
  createEffect(() => {
    setMetaTitle(contentPiece()?.title || "");
  });

  return (
    <>
      <Show
        when={activeContentPieceId()}
        fallback={
          <div class="flex items-center justify-center w-full h-full">
            <span class="text-2xl font-semibold text-gray-500 dark:text-gray-400 text-center">
              Select article to edit
            </span>
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
            class={clsx("p-2 md:mx-10 w-full md:w-[calc(100%-5rem)] flex flex-col items-center")}
          >
            <Show when={workspaceSettings()} keyed>
              <Show when={installedExtensions()} keyed>
                <Show when={contentPieces[activeContentPieceId() || ""]} keyed>
                  <Editor
                    editable={hasPermission("editContent")}
                    docName={docName()}
                    scrollableContainerRef={scrollableContainerRef}
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
              </Show>
            </Show>
          </div>
        </div>
        <Show
          when={
            loadingInstalledExtensions() ||
            activeContentPieceId.loading ||
            !contentPieces[activeContentPieceId() || ""] ||
            (activeContentPieceId() && syncing())
          }
        >
          <div class="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800 absolute top-0 left-0">
            <Loader />
          </div>
        </Show>
      </Show>
    </>
  );
};

export { ContentPieceEditorView };
