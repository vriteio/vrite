import { Component, Show, createEffect, createResource, lazy, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Loader } from "@vrite/components";
import clsx from "clsx";
import type { monaco } from "#lib/monaco";
import { breakpoints, createRef } from "#lib/utils";
import { useAppearance, useClient, useLocalStorage, useSharedState } from "#context";

declare module "#context" {
  interface SharedState {
    conflictData: {
      pulledContent: string;
      pulledHash: string;
      contentPieceId: string;
      variantId?: string;
      currentContent: string;
      path: string;
    } | null;
    resolvedContent: string;
  }
}

const ConflictView: Component<{ monaco: typeof monaco }> = (props) => {
  const client = useClient();
  const navigate = useNavigate();
  const { setStorage } = useLocalStorage();
  const { monaco } = props;
  const { codeEditorTheme = () => "dark" } = useAppearance() || {};
  const { useSharedSignal } = useSharedState();
  const [containerRef, setContainerRef] = createRef<HTMLDivElement | null>(null);
  const [conflictData] = useSharedSignal("conflictData");
  const [, setResolvedContent] = useSharedSignal("resolvedContent");

  onMount(() => {
    if (!conflictData()) {
      navigate("/");

      return;
    }

    const originalModel = monaco.editor.createModel("", "markdown");
    const modifiedModel = monaco.editor.createModel("", "markdown");
    const diffEditor = monaco.editor.createDiffEditor(containerRef()!, {
      // You can optionally disable the resizing
      enableSplitViewResizing: false,
      overviewRulerBorder: true,
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: false,
      renderOverviewRuler: false,
      renderSideBySide: false,
      fontSize: 13,
      fontFamily: "JetBrainsMonoVariable",
      scrollBeyondLastLine: false,
      theme: "dark",
      scrollbar: {
        alwaysConsumeMouseWheel: false
      }
    });

    diffEditor.setModel({
      original: originalModel,
      modified: modifiedModel
    });
    modifiedModel.onDidChangeContent(() => {
      setResolvedContent(modifiedModel.getValue());
    });
    createEffect(() => {
      originalModel.setValue(conflictData()?.pulledContent || "");
    });
    createEffect(() => {
      modifiedModel.setValue(conflictData()?.currentContent || "");
    });
    createEffect(() => {
      diffEditor.updateOptions({ renderSideBySide: breakpoints.md() });
    });
  });
  createEffect(() => {
    props.monaco.editor.setTheme(`${codeEditorTheme()}`);
  });
  setStorage((storage) => ({
    ...storage,
    toolbarView: "conflict"
  }));

  return (
    <div class="flex flex-col h-full w-full relative">
      <div
        class={clsx(
          "w-full h-8 border-b-2 hidden md:flex",
          codeEditorTheme() === "light" && "bg-gray-50 text-gray-500 border-gray-200",
          codeEditorTheme() === "dark" && "bg-gray-900 text-gray-400 border-gray-700"
        )}
      >
        <div
          class={clsx(
            "flex-1 flex justify-center items-center border-r-1",
            codeEditorTheme() === "light" ? "border-gray-200" : "border-gray-700"
          )}
        >
          Incoming
        </div>
        <div
          class={clsx(
            "flex-1 flex justify-center items-center border-l-1",
            codeEditorTheme() === "light" ? "border-gray-200" : "border-gray-700"
          )}
        >
          Result
        </div>
      </div>
      <div
        ref={setContainerRef}
        class="flex-1 h-full w-full split-view"
        data-code-editor-theme={codeEditorTheme()}
      />
      <Show when={!conflictData()}>
        <div class="h-full w-full absolute top-0 left-0 bg-gray-100 dark:bg-gray-800 flex justify-center items-center z-12">
          <Show when={!conflictData()} fallback={<Loader />}>
            <span class="text-2xl font-semibold text-gray-500 dark:text-gray-400">
              Select a conflict to resolve
            </span>
          </Show>
        </div>
      </Show>
    </div>
  );
};
const ConflictViewWrapper: Component = lazy(async () => {
  const { monaco } = await import("#lib/monaco");

  return {
    default: () => <ConflictView monaco={monaco} />
  };
});

export { ConflictViewWrapper as ConflictView };
