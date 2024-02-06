import { Extension } from "@tiptap/core";
import { isNodeSelection } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { breakpoints } from "#lib/utils";
import { dragVerticalIcon } from "#assets/icons/drag-vertical";

const draggableBlocks = [
  "heading",
  "paragraph",
  "blockquote",
  "bulletList",
  "orderedList",
  "taskList"
];
const DraggableText = Extension.create({
  name: "draggableText",
  addProseMirrorPlugins() {
    const { editor } = this;
    const handleDragDrop = (editor: EditorView, event: DragEvent): boolean => {
      if (!isNodeSelection(editor.state.selection)) {
        return true;
      }

      return false;
    };

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragstart: handleDragDrop
          },
          handleDrop: handleDragDrop,
          decorations(state) {
            if (!breakpoints.md()) return DecorationSet.empty;

            const blocks: Array<{ pos: number; node: Node }> = [];

            state.doc.descendants((node, pos) => {
              if (draggableBlocks.includes(node.type.name)) {
                blocks.push({ pos, node });
              }

              return false;
            });

            return DecorationSet.create(
              state.doc,
              blocks.flatMap(({ pos, node }) => {
                const container = document.createElement("div");
                const handle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                const nodeDecoration = Decoration.node(pos, pos + 1, { draggable: "true" });

                if (
                  node.type.name === "paragraph" &&
                  (!node.textContent || node.textContent.startsWith("/"))
                ) {
                  return [];
                }

                container.setAttribute("data-widget", "draggableText");
                handle.setAttribute("viewBox", "0 0 24 24");
                path.setAttribute("stroke", "currentColor");
                path.setAttribute("stroke-linecap", "round");
                path.setAttribute("stroke-linejoin", "round");
                path.setAttribute("stroke-width", "2");
                path.setAttribute("d", dragVerticalIcon);
                handle.appendChild(path);
                container.appendChild(handle);
                container.addEventListener("mousedown", () => {
                  editor.commands.setNodeSelection(pos);
                });

                return [
                  Decoration.widget(pos + 1, container),
                  ...(isNodeSelection(editor.state.selection) ? [nodeDecoration] : [])
                ];
              })
            );
          }
        }
      })
    ];
  }
});

export { DraggableText };
