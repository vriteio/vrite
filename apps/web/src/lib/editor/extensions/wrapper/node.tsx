import { WrapperMenu } from "./menu";
import { Wrapper as BaseWrapper, WrapperAttributes } from "@vrite/editor";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { NodeView } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Node } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";

const Wrapper = BaseWrapper.extend({
  addProseMirrorPlugins() {
    const handleDeleteWrapper = (state: EditorState): boolean => {
      if (this.editor.isActive("wrapper")) {
        const currentDepth = state.selection.$from.depth;

        let node: Node | null = null;
        let pos: number | null = null;

        for (let i = currentDepth; i >= 0; i--) {
          const currentNode = state.selection.$from.node(i);

          if (currentNode.type.name === "wrapper") {
            node = currentNode;
            pos = i > 0 ? state.selection.$from.before(i) : 0;
            break;
          }
        }

        if (
          node &&
          !node.textContent &&
          node.content.childCount === 1 &&
          node.content.firstChild?.type.name === "paragraph" &&
          typeof pos === "number"
        ) {
          this.editor
            .chain()
            .deleteRange({
              from: pos,
              to: pos + node.nodeSize
            })
            .focus()
            .run();

          return true;
        }
      }

      return false;
    };

    return [
      keymap({
        Delete: handleDeleteWrapper,
        Backspace: handleDeleteWrapper
      })
    ];
  },
  addNodeView() {
    const editor = this.editor as SolidEditor;

    return (props) => {
      let node = props.node as Node;

      const referenceView = new NodeView(() => {}, props);
      const dom = document.createElement("div");
      const content = document.createElement("div");
      const menu = document.createElement("div");

      dom.setAttribute(
        "class",
        "px-3 pt-3 my-5 rounded-3xl border-gray-300 bg-gray-300 bg-opacity-30 dark:border-gray-700 dark:bg-gray-700 dark:bg-opacity-40 border-2"
      );
      dom.setAttribute("data-wrapper", "true");
      content.setAttribute("class", "relative content mb-3");
      menu.setAttribute("class", "mb-5");
      menu.contentEditable = "false";

      const renderer = new SolidRenderer<{ deleteNode(): void }>(WrapperMenu, {
        editor: this.editor as SolidEditor,
        state: {
          deleteNode: () => {
            if (typeof props.getPos === "function") {
              editor
                .chain()
                .deleteRange({
                  from: props.getPos(),
                  to: props.getPos() + node.nodeSize
                })
                .focus()
                .run();
            }
          }
        }
      });

      menu.append(renderer.element);
      dom.append(menu, content);

      return {
        dom,
        contentDOM: content,
        ignoreMutation(mutation: MutationRecord | { type: "selection"; target: Element }) {
          if (mutation.type === "selection") {
            return false;
          }

          return referenceView.ignoreMutation(mutation);
        },
        stopEvent(event) {
          return referenceView.stopEvent(event);
        },
        destroy() {
          renderer.destroy();
        },
        update(newNode) {
          if (newNode.type.name !== "wrapper") return false;

          node = newNode as Node;

          return true;
        }
      };
    };
  }
});

export { Wrapper };
export type { WrapperAttributes };
