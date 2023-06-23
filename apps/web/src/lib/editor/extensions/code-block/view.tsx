import { CodeBlockAttributes, CodeBlockOptions } from "./node";
import { CodeBlockMenu } from "./menu";
import { useSolidNodeView } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, createEffect, createSignal, onMount } from "solid-js";
import { nanoid } from "nanoid";
import { formatCode, monaco } from "#lib/code-editor";
import { Card } from "#components/primitives";
import { createRef, selectionClasses } from "#lib/utils";
import { useAppearanceContext, useAuthenticatedContext, useNotificationsContext } from "#context";

interface CodeBlockViewProps {
  codeEditorRef(): monaco.editor.IStandaloneCodeEditor | null;
  updatingRef(): boolean | null;
  setCodeEditorRef(value: monaco.editor.IStandaloneCodeEditor): void;
  setUpdatingRef(value: boolean): void;
}

const getExtension = (language: string): string => {
  if (language === "typescript") {
    return ".tsx";
  } else if (language === "javascript") {
    return ".jsx";
  }

  return (
    monaco.languages.getLanguages().find((item) => {
      return item.id === language;
    })?.extensions?.[0] || ""
  );
};
const CodeBlockView: Component<CodeBlockViewProps> = (props) => {
  const { state } = useSolidNodeView<CodeBlockAttributes>();
  const { workspaceSettings = () => null } = useAuthenticatedContext() || {};
  const { codeEditorTheme = () => "dark" } = useAppearanceContext() || {};
  const { notify } = useNotificationsContext();
  const attrs = (): CodeBlockAttributes => state().node.attrs;
  const options = (): CodeBlockOptions => state().extension.options;
  const [editorContainerRef, setEditorContainerRef] = createRef<HTMLElement | null>(null);
  const [decorationsRef, setDecorationsRef] = createRef<string[]>([]);
  const [codeEditor, setCodeEditor] = createSignal<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const [currentModelValue, setCurrentModelValue] = createRef("");
  const selected = (): boolean => {
    return state().selected;
  };
  const format = async (): Promise<void> => {
    try {
      const formattingCode = formatCode(
        codeEditor()?.getValue() || "",
        attrs().lang || "",
        JSON.parse(workspaceSettings()?.prettierConfig || "{}")
      );

      notify({ text: "Formatting code", type: "loading", promise: formattingCode });

      const formattedCode = await formattingCode;

      props.setUpdatingRef(true);

      const { tr } = state().editor.state;
      const offset = state().getPos() + 1;
      const model = codeEditor()?.getModel();

      if (!model) {
        return;
      }

      const range = model.getFullModelRange();
      const start = model.getOffsetAt(monaco.Range.getStartPosition(range));
      const end = model.getOffsetAt(monaco.Range.getEndPosition(range));

      tr.replaceWith(offset + start, offset + end, state().editor.schema.text(formattedCode));
      state().editor.view.dispatch(tr);
      codeEditor()?.executeEdits(null, [
        {
          forceMoveMarkers: true,
          text: formattedCode,
          range
        }
      ]);
      setCurrentModelValue(formattedCode);
      props.setUpdatingRef(false);
      notify({ text: "Code formatted successfully", type: "success" });
    } catch (error) {
      notify({ text: "Couldn't format the code", type: "error" });
    }
  };
  const changeLanguage = (languageId: string | null): void => {
    const model = codeEditor()?.getModel();

    if (model) {
      monaco.editor.setModelLanguage(model, languageId || "");
    }
  };
  const updateEditorHeight = (monacoEditor: monaco.editor.IStandaloneCodeEditor): void => {
    const container = monacoEditor.getContainerDomNode();
    const contentHeight = Math.max(200, monacoEditor.getContentHeight());
    const editorContainer = editorContainerRef();

    if (editorContainer) {
      editorContainer.style.height = `${contentHeight}px`;
    }

    container.style.height = `${contentHeight}px`;
    monacoEditor.layout({
      width: container.clientWidth,
      height: contentHeight
    });
  };

  onMount(() => {
    const editorContainer = editorContainerRef();

    if (editorContainer) {
      const codeEditor = monaco.editor.create(editorContainer, {
        automaticLayout: true,
        model: null,
        fontSize: 13,
        theme: "dark",
        tabSize: 2,
        insertSpaces: true,
        readOnly: !state().editor.isEditable,
        scrollbar: {
          alwaysConsumeMouseWheel: false
        },
        scrollBeyondLastLine: false,
        contextmenu: false,
        minimap: { enabled: false }
      });
      const languageId = attrs().lang || "";

      codeEditor.setModel(
        monaco.editor.createModel(
          state().node.textContent,
          languageId,
          monaco.Uri.file(`${nanoid()}${getExtension(languageId)}`)
        )
      );
      setCurrentModelValue(codeEditor.getModel()?.getValue() || "");
      props.setCodeEditorRef(codeEditor);
      setCodeEditor(codeEditor);
      codeEditor.onDidChangeModelContent((event) => {
        const updating = props.updatingRef();
        const model = codeEditor.getModel();

        if (updating || !codeEditor.hasTextFocus() || !model) return;

        const { tr } = state().editor.state;
        const previousModel = monaco.editor.createModel(currentModelValue() || "");

        let offset = state().getPos() + 1;

        event.changes.forEach((change) => {
          if (change.text.length) {
            const start = previousModel.getOffsetAt(monaco.Range.getStartPosition(change.range));
            const end = previousModel.getOffsetAt(monaco.Range.getEndPosition(change.range));

            tr.replaceWith(
              offset + start,
              offset + end,
              state().editor.schema.text(change.text.toString())
            );
            offset -= end - start;
          } else {
            const start = previousModel.getOffsetAt(monaco.Range.getStartPosition(change.range));
            const end = previousModel.getOffsetAt(monaco.Range.getEndPosition(change.range));

            tr.delete(offset + start, offset + end);
          }
        });
        state().editor.view.dispatch(tr);
        setCurrentModelValue(codeEditor.getModel()?.getValue() || "");
      });
      codeEditor.onDidContentSizeChange(() => updateEditorHeight(codeEditor));
      codeEditor.onDidBlurEditorText(() => {
        options().provider?.awareness?.setLocalStateField("vscSelection", null);
      });
      codeEditor.onDidChangeCursorSelection(() => {
        const model = codeEditor.getModel();
        const sel = codeEditor.getSelection();

        if (sel === null || !model) {
          options().provider?.awareness?.setLocalStateField("vscSelection", null);

          return;
        }

        let anchor = model.getOffsetAt(sel.getStartPosition());
        let head = model.getOffsetAt(sel.getEndPosition());

        if (sel.getDirection() === monaco.SelectionDirection.RTL) {
          const tmp = anchor;

          anchor = head;
          head = tmp;
        }

        options().provider?.awareness?.setLocalStateField("vscSelection", {
          anchor,
          head
        });
      });
      options().provider?.awareness?.on("change", () => {
        const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

        options()
          .provider?.awareness.getStates()
          .forEach((state, clientID) => {
            if (clientID === options().provider?.awareness?.clientID) return;

            const model = codeEditor.getModel();

            if (!state.vscSelection || !model) return;

            const start = model?.getPositionAt(state.vscSelection.anchor || 0);
            const end = model?.getPositionAt(state.vscSelection.head || 0);

            if (!start || !end) {
              return;
            }

            newDecorations.push({
              range: new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column),
              options: {
                className: clsx(
                  "bg-opacity-40 dark:bg-opacity-40",
                  selectionClasses[state.user.selectionColor as keyof typeof selectionClasses]
                    ?.label
                ),
                afterContentClassName: clsx(
                  "absolute h-full border",
                  selectionClasses[state.user.selectionColor as keyof typeof selectionClasses]
                    ?.outline
                )
              }
            });
          });
        setDecorationsRef(codeEditor.deltaDecorations(decorationsRef() || [], newDecorations));
      });
      codeEditor.onKeyDown((event) => {
        if (event.keyCode === monaco.KeyCode.Escape) {
          state().editor.commands.setNodeSelection(state().getPos());
          state().editor.commands.focus();
        }
      });
      codeEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        await format();
        state().editor.commands.setNodeSelection(state().getPos());
        state().editor.commands.focus();
      });
      createEffect(() => {
        monaco.editor.setTheme(codeEditorTheme());
      });
    }
  });

  return (
    <div
      class={clsx(
        "relative rounded-2xl not-prose text-base leading-4 my-5",
        selected() && "ring ring-primary ring-2"
      )}
      contentEditable={selected() ? false : undefined}
      draggable={false}
    >
      <div
        ref={setEditorContainerRef}
        spellcheck={false}
        class={clsx(
          "w-full bg-gray-50 dark:bg-gray-900 h-72 not-prose rounded-t-2xl",
          codeEditorTheme() === "light" && "border-2 border-b-0 dark:border-0"
        )}
      ></div>

      <Card
        class={clsx(
          "m-0 rounded-t-none",
          codeEditorTheme() === "dark" && "border-t-0 dark:border-0 dark:border-t-2",
          codeEditorTheme() === "light" && "dark:border-t-0"
        )}
        contentEditable={false}
      >
        <CodeBlockMenu format={format} changeLanguage={changeLanguage} />
      </Card>
    </div>
  );
};

export { CodeBlockView };
