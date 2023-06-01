import { CodeBlockView } from "./view";
import { NodeViewWrapper, SolidNodeViewRenderer, useSolidNodeView } from "@vrite/tiptap-solid";
import {
  Node,
  mergeAttributes,
  isNodeSelection,
  createChainableState,
  CommandManager,
  Editor
} from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { TextSelection, Plugin, EditorState } from "@tiptap/pm/state";
import { createNanoEvents } from "nanoevents";
import { onCleanup, onMount } from "solid-js";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { nodeInputRule } from "#lib/editor";
import { createRef } from "#lib/utils";
import { monaco } from "#lib/code-editor";

interface CodeBlockAttributes {
  lang?: string;
}
interface CodeBlockOptions {
  inline: boolean;
  HTMLAttributes: CodeBlockAttributes;
  provider: HocuspocusProvider | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    codeBlock: {
      insertCodeBlock: (attrs: CodeBlockAttributes) => ReturnType;
      updateCodeBlock: (attrs: CodeBlockAttributes) => ReturnType;
      removeCodeBlock: () => ReturnType;
    };
  }
}

const emitter = createNanoEvents();
const run = (config: { editor: Editor; state: EditorState; from: number; to: number }): boolean => {
  const { editor, state, from, to } = config;

  const { chain } = new CommandManager({
    editor,
    state
  });

  const handlers: (void | null)[] = [];
  const codeBlockStart = /^```(.+)$/g;
  const codeBlockEnd = /^```$/g;

  let inCodeBlock = false;
  let codeBlockLanguage = "";
  let codeBlockContent: string[] = [];
  let rangeStart = 0;
  let rangeEnd = 0;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock || node.type.spec.code) {
      return;
    }

    const resolvedFrom = Math.max(from, pos);
    const resolvedTo = Math.min(to, pos + node.content.size);
    const textToMatch = node.textBetween(resolvedFrom - pos, resolvedTo - pos, undefined, "\ufffc");

    if (inCodeBlock) {
      if (textToMatch.match(codeBlockEnd)) {
        const end = resolvedFrom + textToMatch.length;

        rangeEnd = state.tr.mapping.map(end);
        chain()
          .deleteRange({
            from: rangeStart,
            to: rangeEnd
          })
          .insertContentAt(rangeStart, {
            type: "codeBlock",
            attrs: {
              lang: codeBlockLanguage
            },
            content: [{ text: codeBlockContent.join("\n"), type: "text" }]
          });

        inCodeBlock = false;
        codeBlockLanguage = "";
        codeBlockContent = [];
        rangeStart = 0;
        rangeEnd = 0;
      } else {
        codeBlockContent.push(textToMatch);
      }
      return;
    }
    const result = codeBlockStart.exec(textToMatch);

    if (result) {
      inCodeBlock = true;
      codeBlockLanguage = result[1].trim();

      const start = resolvedFrom;
      rangeStart = state.tr.mapping.map(start);
    }
  });

  return true;
};

const CodeBlock = Node.create<CodeBlockOptions>({
  name: "codeBlock",

  content: "text*",

  marks: "",

  group: "block",

  code: true,

  atom: true,

  addOptions() {
    return {
      provider: null,
      inline: false,
      HTMLAttributes: {}
    };
  },
  addAttributes() {
    return {
      lang: {
        default: null
      }
    };
  },
  parseHTML() {
    return [
      {
        tag: "pre"
      }
    ];
  },
  addNodeView() {
    const [codeEditorRef, setCodeEditorRef] = createRef<monaco.editor.IStandaloneCodeEditor | null>(
      null
    );
    const [updatingRef, setUpdatingRef] = createRef(false);

    return SolidNodeViewRenderer(
      () => {
        const { state } = useSolidNodeView();

        onMount(() => {
          const unbind = emitter.on("focus", () => {
            if (state().selected) {
              const tr = state().editor.state.tr.setSelection(
                TextSelection.create(
                  state().editor.state.doc,
                  state().getPos() + 1,
                  state().getPos() + 1
                )
              );

              state().editor.view.dispatch(tr);
              codeEditorRef()?.focus();
            }
          });

          onCleanup(() => {
            unbind();
          });
        });

        return (
          <NodeViewWrapper>
            <CodeBlockView
              updatingRef={updatingRef}
              codeEditorRef={codeEditorRef}
              setUpdatingRef={setUpdatingRef}
              setCodeEditorRef={setCodeEditorRef}
            />
          </NodeViewWrapper>
        );
      },
      {
        update({ oldNode, newNode, newDecorations, oldDecorations, updateProps }) {
          if (newNode.type != oldNode.type) return false;

          if (oldNode === newNode && oldDecorations === newDecorations) {
            return true;
          }

          if (updatingRef()) return true;

          const newText = newNode.textContent;
          const curText = codeEditorRef()?.getValue() || "";

          if (newText != curText) {
            let start = 0;
            let curEnd = curText.length;
            let newEnd = newText.length;

            while (start < curEnd && curText.charCodeAt(start) == newText.charCodeAt(start)) {
              start += 1;
            }

            while (
              curEnd > start &&
              newEnd > start &&
              curText.charCodeAt(curEnd - 1) == newText.charCodeAt(newEnd - 1)
            ) {
              curEnd -= 1;
              newEnd -= 1;
            }

            setUpdatingRef(true);

            const codeEditor = codeEditorRef();
            const model = codeEditor?.getModel();

            if (codeEditor && model) {
              codeEditor.executeEdits(null, [
                {
                  forceMoveMarkers: true,
                  text: newText.slice(start, newEnd),
                  range: monaco.Range.fromPositions(
                    model.getPositionAt(start),
                    model.getPositionAt(curEnd)
                  )
                }
              ]);
            }

            setUpdatingRef(false);
          }

          updateProps();

          return true;
        }
      }
    );
  },
  renderHTML({ HTMLAttributes }) {
    return ["pre", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), ["code", {}, 0]];
  },
  addCommands() {
    return {
      insertCodeBlock: (attrs) => {
        return ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs
          });
        };
      },
      updateCodeBlock: (attrs) => {
        return ({ commands }) => {
          return commands.updateAttributes(this.name, attrs);
        };
      },
      removeCodeBlock: () => {
        return ({ commands }) => {
          return commands.deleteNode(this.name);
        };
      }
    };
  },
  addProseMirrorPlugins() {
    const { editor } = this;
    let dragSourceElement: Element | null = null;
    let isPastedFromProseMirror = false;
    let isDroppedFromProseMirror = false;

    return [
      keymap({
        Enter: (state) => {
          if (isNodeSelection(state.selection) && state.selection.node.type === this.type) {
            emitter.emit("focus");

            return true;
          }

          return false;
        }
      }),
      new Plugin({
        // we register a global drag handler to track the current drag source element
        view(view) {
          const handleDragstart = (event: DragEvent) => {
            dragSourceElement = view.dom.parentElement?.contains(event.target as Element)
              ? view.dom.parentElement
              : null;
          };

          window.addEventListener("dragstart", handleDragstart);

          return {
            destroy() {
              window.removeEventListener("dragstart", handleDragstart);
            }
          };
        },

        props: {
          handleDOMEvents: {
            drop: (view) => {
              isDroppedFromProseMirror = dragSourceElement === view.dom.parentElement;

              return false;
            },

            paste: (view, event: Event) => {
              const html = (event as ClipboardEvent).clipboardData?.getData("text/html");

              isPastedFromProseMirror = !!html?.includes("data-pm-slice");

              return false;
            }
          }
        },

        appendTransaction: (transactions, oldState, state) => {
          const transaction = transactions[0];
          const isPaste = transaction.getMeta("uiEvent") === "paste" && !isPastedFromProseMirror;
          const isDrop = transaction.getMeta("uiEvent") === "drop" && !isDroppedFromProseMirror;

          console.log(isDrop, isPaste);
          if (!isPaste && !isDrop) {
            return;
          }

          // stop if there is no changed range
          const from = oldState.doc.content.findDiffStart(state.doc.content);
          const to = oldState.doc.content.findDiffEnd(state.doc.content);

          if (typeof from !== "number" || !to || from === to.b) {
            return;
          }

          // build a chainable state
          // so we can use a single transaction for all paste rules
          const tr = state.tr;
          const chainableState = createChainableState({
            state,
            transaction: tr
          });

          const handler = run({
            editor,
            state: chainableState,
            from: Math.max(from - 1, 0),
            to: to.b - 1
          });

          // stop if there are no changes
          if (!handler || !tr.steps.length) {
            return;
          }

          return tr;
        }
      })
    ];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: /(^```(.*?)\s$)/,
        type: this.type,
        getAttributes: (match) => {
          const [, , lang] = match;

          return { lang };
        }
      })
    ];
  }
});

export { CodeBlock, CodeBlockView };
export type { CodeBlockAttributes, CodeBlockOptions };
