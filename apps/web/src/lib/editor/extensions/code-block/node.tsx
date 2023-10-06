import { CodeBlockView } from "./view";
import {
  CodeBlock as BaseCodeBlock,
  CodeBlockOptions as BaseCodeBlockOptions,
  CodeBlockAttributes
} from "@vrite/editor";
import { NodeViewWrapper, SolidNodeViewRenderer, useSolidNodeView } from "@vrite/tiptap-solid";
import { isNodeSelection } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { TextSelection } from "@tiptap/pm/state";
import { createNanoEvents } from "nanoevents";
import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { monaco } from "#lib/monaco";
import { createRef } from "#lib/utils";

interface CodeBlockOptions extends BaseCodeBlockOptions {
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
const CodeBlock = BaseCodeBlock.extend<CodeBlockOptions>({
  addOptions() {
    return {
      provider: null,
      inline: false,
      HTMLAttributes: {}
    };
  },
  addNodeView() {
    const [codeEditorRef, setCodeEditorRef] = createRef<monaco.editor.IStandaloneCodeEditor | null>(
      null
    );
    const [updatingRef, setUpdatingRef] = createRef(false);
    const [monacoRef, setMonacoRef] = createRef<typeof monaco | null>(null);

    return SolidNodeViewRenderer(
      () => {
        const { state } = useSolidNodeView();
        const [loading, setLoading] = createSignal(true);

        onMount(async () => {
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
          import("#lib/monaco").then(({ monaco }) => {
            setMonacoRef(monaco);
            setLoading(false);
          });
        });

        return (
          <NodeViewWrapper>
            <Show when={!loading()}>
              <CodeBlockView
                monaco={monacoRef()!}
                updatingRef={updatingRef}
                codeEditorRef={codeEditorRef}
                setUpdatingRef={setUpdatingRef}
                setCodeEditorRef={setCodeEditorRef}
              />
            </Show>
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
                  range: monacoRef()!.Range.fromPositions(
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
  }
});

export { CodeBlock, CodeBlockView };
export type { CodeBlockAttributes, CodeBlockOptions };
