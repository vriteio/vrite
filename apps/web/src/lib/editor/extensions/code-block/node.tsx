import { CodeBlockView } from "./view";
import { NodeViewWrapper, SolidNodeViewRenderer, useSolidNodeView } from "@vrite/tiptap-solid";
import { Node, mergeAttributes, isNodeSelection } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { TextSelection } from "@tiptap/pm/state";
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

const inputRegex = /(^```(.*?)\s$)/;
const emitter = createNanoEvents();
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
    return [
      keymap({
        Enter: (state) => {
          if (isNodeSelection(state.selection) && state.selection.node.type === this.type) {
            emitter.emit("focus");

            return true;
          }

          return false;
        }
      })
    ];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
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
