import { isElementSelection, isElementSelectionActive } from "../element/selection";
import {
  createEffect,
  createMemo,
  createRenderEffect,
  createSignal,
  lazy,
  on,
  onCleanup,
  onMount
} from "solid-js";
import { createRef } from "@vrite/components/src/ref";
import clsx from "clsx";
import { nanoid } from "nanoid";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Node as PMNode } from "@tiptap/pm/model";
import { monaco } from "#lib/monaco";
import { useAppearance } from "#context";
import { formatCode } from "#lib/code-editor";

interface ElementMenuState {
  type: string;
  active: boolean;
  props: Record<string, any>;
  editor: SolidEditor;
  contentSize: number;
  removeElement(): void;
  setElement(element: { type: string; props: Record<string, any>; content: boolean }): void;
}

interface ElementMenuEditorProps {
  state: ElementMenuState;
  setState: (
    state: Partial<{
      pos: number;
      node: PMNode | null;
      container: HTMLElement | null;
      editor: SolidEditor;
      active: boolean;
    }>
  ) => void;
}

const codeEditorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  minimap: { enabled: false },
  contextmenu: false,
  fontSize: 17.5,
  fontFamily: "JetBrainsMonoVariable",
  scrollBeyondLastLine: false,
  model: null,
  wordWrap: "on",
  theme: "dark",
  suggestFontSize: 13,
  codeLensFontSize: 13,
  lineHeight: 26,
  suggestLineHeight: 21,
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  lineNumbers: "off",
  glyphMargin: false,
  folding: false,
  quickSuggestions: false,
  lightbulb: { enabled: false },
  hover: { enabled: false },
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  renderLineHighlightOnlyWhenFocus: true,
  renderLineHighlight: "none",
  scrollbar: {
    vertical: "hidden",
    horizontal: "hidden",
    alwaysConsumeMouseWheel: false
  }
};
const ElementMenuEditor = lazy(async () => {
  const { monaco } = await import("#lib/monaco");

  return {
    default: (props: ElementMenuEditorProps) => {
      const { codeEditorTheme = () => "dark" } = useAppearance() || {};
      const [editorContainerRef, setEditorContainerRef] = createRef<HTMLElement | null>(null);
      const [coords, setCoords] = createSignal({ x: 0, y: 0 });
      const [visible, setVisible] = createSignal(true);
      const type = createMemo(() => props.state.type);
      const processCode = async (code: string): Promise<string> => {
        const codeTagClosed = code?.trim().replace(/>$/, "/>") || "";
        const formattedCode = await formatCode(codeTagClosed, "typescript", {
          printWidth: 60,
          trailingComma: "none",
          singleQuote: false
        });

        return formattedCode.replace(/ *?\/>;/gm, props.state.contentSize ? ">" : "/>").trim();
      };
      const propsValue = createMemo((previous) => {
        if (!previous || JSON.stringify(previous) !== JSON.stringify(props.state.props)) {
          return props.state.props;
        }

        return previous;
      });
      const editorCode = createMemo(() => {
        const keyValueProps = Object.entries(propsValue()).map(([key, value]) => {
          if (value === true) return key;

          const useBrackets =
            typeof value !== "string" || value.includes("\n") || value.includes(`"`);

          return `${key}=${useBrackets ? "{" : ""}${JSON.stringify(value)}${
            useBrackets ? "}" : ""
          }`;
        });

        return `<${type()}${keyValueProps.length ? " " : ""}${keyValueProps.join(" ")}>`;
      });
      const saveLastCoords = (event: MouseEvent): void => {
        setCoords({ x: event.clientX, y: event.clientY });
      };
      const onSave = async (code: string): Promise<void> => {
        const tagRegex = /^<(\w+?)(?:\s|\n|\/|>)/;
        const attributeRegex =
          /\s(\w+?)(?:=(?:(?:{((?:.|\n|\s)+?)})|(?:"((?:.|\n|\s)+?)")|(?:'((?:.|\n|\s)+?)')))?(?=(?:(?:\s|\n)+\w+=?)|(?:(?:\s|\n)*\/?>))/g;
        const [, tag] = tagRegex.exec(code.trim()) || [];
        const attributes: Record<string, any> = {};
        const processAttributes = async (): Promise<void> => {
          const match = attributeRegex.exec(code.trim());

          if (!match) return;

          const [, key] = match;
          const value = (match[2] || match[3] || match[4] || "true").trim();

          try {
            const processedValue = await formatCode(value, "json", {
              trailingComma: "none"
            });

            attributes[key] = JSON.parse(processedValue);
          } catch (e) {
            try {
              attributes[key] = JSON.parse(value);
            } catch (e) {
              if (!props.state.props[key] || typeof props.state.props[key] === "string") {
                attributes[key] = value;
              } else {
                attributes[key] = props.state.props[key];
              }
            }
          }

          await processAttributes();
        };

        await processAttributes();

        if (tag && tag !== "undefined") {
          props.state.setElement({
            type: tag,
            props: attributes,
            content: !code.endsWith("/>")
          });
        } else {
          props.state.removeElement();
        }
      };

      onMount(() => {
        const editorContainer = editorContainerRef()!;
        const codeEditor = monaco.editor.create(editorContainer, codeEditorOptions);
        const updateEditorHeight = (): void => {
          const container = codeEditor.getContainerDomNode();
          const contentHeight = Math.max(26, codeEditor.getContentHeight());

          if (editorContainer) {
            editorContainer.style.height = `${contentHeight}px`;
          }

          container.style.height = `${contentHeight}px`;
          codeEditor.layout({
            width: container.clientWidth,
            height: contentHeight
          });
        };

        codeEditor.onDidContentSizeChange(updateEditorHeight);
        codeEditor.onDidChangeModelContent(() => {
          const code = document.querySelector(".selected-element-code") as HTMLElement;
          const bottomCode = document.querySelector(".selected-element-bottom-code") as HTMLElement;
          const value = codeEditor.getValue() || "";

          if (code) {
            code.textContent = value;
            code.style.minHeight = `${codeEditor.getContentHeight()}px`;
          }

          if (bottomCode) {
            const tag = value.match(/^<(\w+?)(?:\s|\n|\/|>)/)?.[1] || "";

            bottomCode.textContent = tag || "";
          }
        });
        codeEditor.onDidBlurEditorText(async () => {
          const code = document.querySelector(".selected-element-code") as HTMLElement;
          const bottomCode = document.querySelector(".selected-element-bottom-code") as HTMLElement;
          const value = await processCode(editorCode());

          if (code) {
            code.textContent = value;
          }

          if (bottomCode) {
            const tag = value.match(/^<(\w+?)(?:\s|\n|\/|>)/)?.[1] || "";

            bottomCode.textContent = tag || "";
          }

          await onSave(codeEditor.getValue());
        });
        codeEditor.addAction({
          id: "save",
          label: "Save",
          keybindings: [monaco.KeyCode.Escape],
          run() {
            // props.setState({ active: false });
            props.state.editor
              .chain()
              .setElementSelection(props.state.editor.state.selection.$from.pos, false)
              .focus()
              .run();
          }
        });
        codeEditor.setModel(
          monaco.editor.createModel(
            editorCode(),
            "javascript",
            monaco.Uri.parse(`file:///${nanoid()}`)
          )
        );
        createEffect(() => {
          monaco.editor.setTheme(codeEditorTheme());
        });
        createEffect(
          on(
            () => {
              return (
                isElementSelection(props.state.editor.state.selection) &&
                isElementSelectionActive(props.state.editor.state.selection)
              );
            },
            (active) => {
              setVisible(false);
              setTimeout(() => {
                const element: HTMLElement | null = document.querySelector(
                  ".selected-element-code"
                ) as HTMLElement;

                if (!element) return;

                if (active) {
                  codeEditor.setValue(element?.textContent || "");
                  setVisible(true);

                  const { position } =
                    codeEditor?.getTargetAtClientPoint(coords().x, coords().y) || {};

                  if (position) {
                    codeEditor?.setSelection(monaco.Range.fromPositions(position, position));
                  }

                  codeEditor?.focus();
                  element.style.minHeight = `${codeEditor.getContentHeight()}px`;
                } else {
                  element.style.minHeight = "unset";
                }
              }, 0);
            }
          )
        );
        onCleanup(() => {
          codeEditor.getModel()?.dispose();
          codeEditor.dispose();
        });
      });
      createRenderEffect(
        on(type, (type, previousType) => {
          if (type !== previousType) setVisible(false);
        })
      );
      window.addEventListener("pointerdown", saveLastCoords);
      onCleanup(() => {
        window.removeEventListener("pointerdown", saveLastCoords);
      });

      return (
        <div
          class={clsx(
            "w-full flex items-center justify-start",
            !visible() && "hidden opacity-0 pointer-events-none transition-opacity duration-200"
          )}
          contentEditable={false}
        >
          <div class="relative w-full">
            <div
              ref={setEditorContainerRef}
              class="w-full not-prose customized-editor customized-editor-contrast customized-editor-show-keyboard-hidden"
            ></div>
          </div>
        </div>
      );
    }
  };
});

export { ElementMenuEditor };
