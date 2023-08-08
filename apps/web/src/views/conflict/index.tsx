import { Component, createEffect, createResource, lazy, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import type { monaco } from "#lib/monaco";
import { createRef } from "#lib/utils";
import { useAppearance, useClient, useLocalStorage, useSharedState } from "#context";

declare module "#context" {
  interface SharedState {
    conflictData: {
      pulledContent: string;
      pulledHash: string;
      contentPieceId: string;
      path: string;
    };
    resolvedContent: string;
  }
}

const ConflictView: Component<{ monaco: typeof monaco }> = (props) => {
  const client = useClient();
  const navigate = useNavigate();
  const { setStorage } = useLocalStorage();
  const { monaco } = props;
  const { codeEditorTheme = () => "dark" } = useAppearance() || {};
  const createSharedSignal = useSharedState();
  const [containerRef, setContainerRef] = createRef<HTMLDivElement | null>(null);
  const [conflictData] = createSharedSignal("conflictData");
  const [, setResolvedContent] = createSharedSignal("resolvedContent");
  const [currentContent] = createResource(
    () => conflictData()?.contentPieceId,
    async (contentPieceId) => {
      if (!contentPieceId) return null;

      try {
        const result = await client.git.github.getConflictedContent.query({
          contentPieceId
        });

        return result.content;
      } catch (e) {
        return null;
      }
    }
  );

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
      automaticLayout: true,
      minimap: { enabled: false },
      contextmenu: false,
      renderOverviewRuler: false,
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
      modifiedModel.setValue(currentContent() || "");
    });
  });
  createEffect(() => {
    props.monaco.editor.setTheme(`${codeEditorTheme()}`);
  });
  setStorage((storage) => ({
    ...storage,
    toolbarView: "conflict"
  }));

  return <div ref={setContainerRef} class="h-full w-full split-view" />;
};
const ConflictViewWrapper: Component = lazy(async () => {
  const { monaco } = await import("#lib/monaco");

  return {
    default: () => <ConflictView monaco={monaco} />
  };
});

export { ConflictViewWrapper as ConflictView };
