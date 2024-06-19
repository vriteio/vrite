import { Editor } from "./editor";
import clsx from "clsx";
import { Component, createSignal, createEffect, on, Show, For, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import dayjs from "dayjs";
import { Title } from "@solidjs/meta";
import { Loader } from "#components/primitives";
import { createRef } from "#lib/utils";
import {
  useLocalStorage,
  useExtensions,
  useAuthenticatedUserData,
  useContentData,
  useHistoryData,
  App
} from "#context";

const VersionEditorView: Component = () => {
  const { activeVersionId, versions } = useHistoryData();
  const { storage, setStorage } = useLocalStorage();
  const { activeContentPieceId, contentPieces } = useContentData();
  const { loadingInstalledExtensions, installedExtensions } = useExtensions();
  const { workspaceSettings } = useAuthenticatedUserData();
  const navigate = useNavigate();
  const [syncing, setSyncing] = createSignal(true);
  const [lastScrollTop, setLastScrollTop] = createSignal(0);
  const [reloaded, setReloaded] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const contentPiece = ():
    | App.ExtendedContentPieceWithAdditionalData<"order" | "coverWidth">
    | undefined => contentPieces[activeContentPieceId() || ""];
  const versionName = createMemo((): string => {
    if (!activeVersionId()) return "";

    const version = versions[activeVersionId()];

    if (!version) return "";

    return version.label || dayjs(version.date).format("MMMM DD, HH:mm");
  });
  const docName = (): string => {
    return `version:${activeVersionId() || ""}`;
  };

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
    on(
      activeVersionId,
      (newVersion, previousVersion) => {
        if (!newVersion) {
          navigate(`/editor/${activeContentPieceId() || ""}`, { replace: true });
        }

        if (newVersion !== previousVersion) {
          setSyncing(true);
        }
      },
      { defer: true }
    )
  );

  return (
    <>
      <Show
        when={activeVersionId()}
        fallback={
          <div class="flex items-center justify-center w-full h-full">
            <span class="text-2xl font-semibold text-gray-500 dark:text-gray-400 text-center">
              Select version for preview
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
            <Show when={workspaceSettings() && installedExtensions()} keyed>
              <Show when={activeVersionId()} keyed>
                <Editor
                  editable={false}
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
                >
                  <For each={["top", "bottom"]}>
                    {(position) => {
                      return (
                        <div
                          class={clsx(
                            "flex items-center text-sm absolute w-full text-gray-300 dark:text-gray-600 select-none pointer-events-none",
                            position === "top" && "top-[calc(1rem-20px)]",
                            position === "bottom" && "bottom-[calc(12rem-20px)]"
                          )}
                        >
                          <div class="flex-1 h-2px bg-current opacity-50" />
                          <span class="font-mono px-1">Version {versionName()}</span>
                          <div class="flex-1 h-2px bg-current opacity-50" />
                        </div>
                      );
                    }}
                  </For>
                </Editor>
              </Show>
            </Show>
          </div>
        </div>
        <Show when={loadingInstalledExtensions() || (activeVersionId() && syncing())}>
          <div class="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-800 absolute top-0 left-0">
            <Loader />
          </div>
        </Show>
      </Show>
    </>
  );
};

export { VersionEditorView };
