import { CodeBlockAttributes, CodeBlockOptions } from "./node";
import { CodeBlockMenu } from "./menu";
import { useSolidNodeView } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, createEffect, createSignal, on, onMount } from "solid-js";
import { nanoid } from "nanoid";
import type { monaco } from "#lib/monaco";
import { formatCode } from "#lib/code-editor";
import { createRef, selectionClasses } from "#lib/utils";
import { useAppearance, useAuthenticatedUserData, useNotifications } from "#context";

interface CodeBlockViewProps {
  monaco: typeof monaco;
  codeEditorRef(): monaco.editor.IStandaloneCodeEditor | null;
  updatingRef(): boolean | null;
  setCodeEditorRef(value: monaco.editor.IStandaloneCodeEditor): void;
  setUpdatingRef(value: boolean): void;
}

const getExtension = (
  languages: monaco.languages.ILanguageExtensionPoint[],
  language: string
): string => {
  if (language === "typescript") {
    return ".tsx";
  } else if (language === "javascript") {
    return ".jsx";
  }

  return (
    languages.find((item) => {
      return item.id === language;
    })?.extensions?.[0] || ""
  );
};
const CodeBlockView: Component<CodeBlockViewProps> = (props) => {
  const { state } = useSolidNodeView<CodeBlockAttributes>();
  const { workspaceSettings = () => null } = useAuthenticatedUserData() || {};
  const { codeEditorTheme = () => "dark" } = useAppearance() || {};
  const { notify } = useNotifications();
  const attrs = (): CodeBlockAttributes => state().node.attrs;
  const options = (): CodeBlockOptions => state().extension.options;
  const [editorContainerRef, setEditorContainerRef] = createRef<HTMLElement | null>(null);
  const [decorationsRef, setDecorationsRef] = createRef<string[]>([]);
  const [codeEditor, setCodeEditor] = createSignal<monaco.editor.IStandaloneCodeEditor | null>(
    null
  );
  const [codeEditorActive, setCodeEditorActive] = createSignal(false);
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

      const formattedCode = (await formattingCode).trim();

      props.setUpdatingRef(true);

      const { tr } = state().editor.state;
      const offset = state().getPos() + 1;
      const model = codeEditor()?.getModel();

      if (!model) {
        return;
      }

      const range = model.getFullModelRange();
      const start = model.getOffsetAt(props.monaco.Range.getStartPosition(range));
      const end = model.getOffsetAt(props.monaco.Range.getEndPosition(range));

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
      props.monaco.editor.setModelLanguage(model, languageId || "");
    }
  };
  const updateEditorHeight = (monacoEditor: monaco.editor.IStandaloneCodeEditor): void => {
    const container = monacoEditor.getContainerDomNode();
    const contentHeight = Math.max(20, monacoEditor.getContentHeight());
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

  onMount(async () => {
    const editorContainer = editorContainerRef();

    if (editorContainer) {
      const codeEditor = props.monaco.editor.create(editorContainer, {
        automaticLayout: true,
        model: null,
        fontSize: 13,
        fontFamily: "JetBrainsMonoVariable",
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
        props.monaco.editor.createModel(
          state().node.textContent,
          languageId,
          props.monaco.Uri.file(
            `${nanoid()}${getExtension(props.monaco.languages.getLanguages(), languageId)}`
          )
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
        const previousModel = props.monaco.editor.createModel(currentModelValue() || "");

        let offset = state().getPos() + 1;

        event.changes.forEach((change) => {
          if (change.text.length) {
            const start = previousModel.getOffsetAt(
              props.monaco.Range.getStartPosition(change.range)
            );
            const end = previousModel.getOffsetAt(props.monaco.Range.getEndPosition(change.range));

            tr.replaceWith(
              offset + start,
              offset + end,
              state().editor.schema.text(change.text.toString())
            );
            offset -= end - start;
          } else {
            const start = previousModel.getOffsetAt(
              props.monaco.Range.getStartPosition(change.range)
            );
            const end = previousModel.getOffsetAt(props.monaco.Range.getEndPosition(change.range));

            tr.delete(offset + start, offset + end);
          }
        });
        state().editor.view.dispatch(tr);
        setCurrentModelValue(codeEditor.getModel()?.getValue() || "");
      });
      codeEditor.onDidContentSizeChange(() => updateEditorHeight(codeEditor));
      codeEditor.onDidBlurEditorText(() => {
        options().provider?.awareness?.setLocalStateField("vscSelection", null);
        setCodeEditorActive(false);
      });
      codeEditor.onDidFocusEditorText(() => {
        setCodeEditorActive(true);
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

        if (sel.getDirection() === props.monaco.SelectionDirection.RTL) {
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
          .provider?.awareness?.getStates()
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
              range: new props.monaco.Range(
                start.lineNumber,
                start.column,
                end.lineNumber,
                end.column
              ),
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
        if (event.keyCode === props.monaco.KeyCode.Escape) {
          state().editor.commands.setNodeSelection(state().getPos());
          state().editor.commands.focus();
        }
      });
      codeEditor.addCommand(props.monaco.KeyMod.CtrlCmd | props.monaco.KeyCode.KeyS, async () => {
        await format();
        state().editor.commands.setNodeSelection(state().getPos());
        state().editor.commands.focus();
      });
      createEffect(() => {
        props.monaco.editor.setTheme(codeEditorTheme());
      });
    }
  });
  createEffect(
    on(codeEditorActive, (active) => {
      if (active) {
        state().editor.commands.setNodeSelection(state().getPos());
      }
    })
  );

  return (
    <div
      class={clsx(
        "relative rounded-2xl text-base leading-4 not-prose",
        selected() && "ring ring-primary ring-2"
      )}
      contentEditable={selected() ? false : undefined}
      draggable={false}
    >
      <div
        ref={setEditorContainerRef}
        spellcheck={false}
        class={clsx(
          "bg-gray-50 dark:bg-gray-900 h-72 rounded-2xl rounded-editor-2xl border-2 border-gray-300 dark:border-gray-700 box-content customized-editor"
        )}
      />
      <div
        class={clsx(
          "absolute w-full justify-center items-center -bottom-14 z-1 pointer-events-none",
          selected() ? "grid" : "hidden"
        )}
      >
        <CodeBlockMenu changeLanguage={changeLanguage} format={format} state={state()} />
      </div>
      <div data-type="draggable-item" />
    </div>
  );
};

export { CodeBlockView };
