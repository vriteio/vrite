import { Component, createEffect, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import { nanoid } from "nanoid";
import clsx from "clsx";
import { debounce } from "@solid-primitives/scheduled";
import { createRef } from "#lib/utils";
import { monaco } from "#lib/code-editor";
import { useAppearanceContext } from "#context";
import { Button } from "#components/primitives";

interface MiniCodeEditorProps {
  wrapperClass?: string;
  wrap?: boolean;
  class?: string;
  code?: string;
  maxHeight?: number;
  minHeight?: number;
  fileName?: string;
  color?: "base" | "contrast";
  language?: string;
  readOnly?: boolean;
  setHeight?: boolean;
  onSave?(code: string): void;
  onChange?(code: string): void;
}

const MiniCodeEditor: Component<MiniCodeEditorProps> = (props) => {
  const { codeEditorTheme } = useAppearanceContext();
  const [editorContainerRef, setEditorContainerRef] = createRef<HTMLElement | null>(null);
  const [codeEditor, setCodeEditor] = createSignal<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const handleChange = debounce((code: string) => {
    props.onChange?.(code);
  }, 300);

  onMount(() => {
    const editorContainer = editorContainerRef();
    const updateEditorHeight = (monacoEditor: monaco.editor.IStandaloneCodeEditor): void => {
      const container = monacoEditor.getContainerDomNode();

      let contentHeight = Math.max(props.minHeight || 112, monacoEditor.getContentHeight() + 0);

      if (props.maxHeight) {
        contentHeight = Math.min(contentHeight, props.maxHeight);
      }

      if (editorContainer) {
        editorContainer.style.height = `${contentHeight}px`;
      }

      container.style.height = `${contentHeight}px`;
      monacoEditor.layout({
        width: container.clientWidth,
        height: contentHeight
      });
    };

    if (editorContainer) {
      const codeEditor = monaco.editor.create(editorContainer, {
        automaticLayout: true,
        minimap: { enabled: false },
        contextmenu: false,
        fontSize: 13,
        hover: { enabled: !props.readOnly },
        scrollBeyondLastLine: false,
        model: null,
        wordWrap: props.wrap ? "on" : "off",
        readOnly: typeof props.readOnly === "boolean" ? props.readOnly : false,
        theme: "dark-contrast",
        scrollbar: {
          alwaysConsumeMouseWheel: false
        }
      });

      setCodeEditor(codeEditor);

      if (typeof props.setHeight !== "boolean" || props.setHeight) {
        codeEditor.onDidContentSizeChange(() => updateEditorHeight(codeEditor));
      }

      codeEditor.setModel(
        monaco.editor.createModel(
          props.code || "",
          props.language || "json",
          props.fileName ? monaco.Uri.file(props.fileName) : monaco.Uri.parse(`file:///${nanoid()}`)
        )
      );
      codeEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        props.onSave?.(codeEditor.getValue());
      });

      const messageContribution = codeEditor.getContribution("editor.contrib.messageController");

      codeEditor.onDidAttemptReadOnlyEdit(() => {
        messageContribution?.dispose();
      });
      createEffect(
        on(
          () => props.code,
          () => {
            const selection = codeEditor.getSelection();

            codeEditor.setValue(props.code || "");
            if (selection) codeEditor.setSelection(selection);
          }
        )
      );
      createEffect(
        on(
          () => props.language,
          () => {
            if (props.readOnly) {
              let fileName = monaco.Uri.parse(`file:///${nanoid()}`);

              if (props.fileName) fileName = monaco.Uri.file(props.fileName);

              codeEditor.getModel()?.dispose();
              codeEditor.setModel(
                monaco.editor.createModel(props.code || "", props.language || "json", fileName)
              );
            }
          }
        )
      );
      createEffect(() => {
        monaco.editor.setTheme(
          `${codeEditorTheme()}${props.color === "contrast" ? "-contrast" : ""}`
        );
      });
      onCleanup(() => {
        codeEditor.getModel()?.dispose();
        codeEditor.dispose();
      });
    }
  });

  return (
    <div class={clsx("relative w-full", props.wrapperClass)}>
      <div
        ref={setEditorContainerRef}
        class={clsx(
          "w-full bg-gray-100 border-2 not-prose dark:bg-gray-900 rounded-2xl dark:border-gray-700",
          props.class
        )}
      ></div>
      <Show when={props.onSave}>
        <Button
          class="absolute right-2 bottom-2"
          color="primary"
          onClick={() => {
            props.onSave?.(codeEditor()?.getValue() || "");
          }}
        >
          Save
        </Button>
      </Show>
    </div>
  );
};

export { MiniCodeEditor };
