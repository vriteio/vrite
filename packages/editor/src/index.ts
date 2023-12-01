import { isNodeSelection } from "@tiptap/core";
import { Paragraph as BaseParagraph } from "@tiptap/extension-paragraph";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const dragVertical =
  "M14 18a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-6 0a1 1 0 1 0 2 0a1 1 0 0 0-2 0m6-6a1 1 0 1 0 2 0a1 1 0 0 0-2 0m-6 0a1 1 0 1 0 2 0a1 1 0 0 0-2 0m6-6a1 1 0 1 0 2 0a1 1 0 0 0-2 0M8 6a1 1 0 1 0 2 0a1 1 0 0 0-2 0";
const Paragraph = BaseParagraph.extend({
  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            dragstart: (_, event) => {
              if (!isNodeSelection(editor.state.selection)) {
                return true;
              }

              return false;
            }
          },
          handleDrop(view, event) {
            if (!isNodeSelection(editor.state.selection)) {
              return true;
            }

            return false;
          },
          decorations(state) {
            const paragraphs: Array<{ pos: number; size: number }> = [];

            state.doc.descendants((node, pos) => {
              if (node.type.name === "paragraph") {
                paragraphs.push({ pos, size: node.nodeSize });
              }

              return false;
            });

            return DecorationSet.create(
              state.doc,
              paragraphs.flatMap(({ pos }) => {
                const container = document.createElement("div");
                const handle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                container.className = "absolute h-full flex justify-center items-start";
                handle.classList.add(
                  "opacity-0",
                  "h-full",
                  "w-full",
                  "cursor-pointer",
                  "rounded-full",
                  "text-gray-500",
                  "dark:text-gray-400",
                  "drag-handle"
                );
                handle.style.height = "1.5rem";
                container.style.width = "1.5rem";
                container.style.top = "0";
                container.style.paddingTop = "0.25rem";
                container.style.left = "-1.5rem";
                handle.style.fill = "currentColor";
                handle.setAttribute("viewBox", "0 0 24 24");
                path.setAttribute("stroke", "currentColor");
                path.setAttribute("stroke-linecap", "round");
                path.setAttribute("stroke-linejoin", "round");
                path.setAttribute("stroke-width", "2");
                path.setAttribute("d", dragVertical);
                handle.appendChild(path);
                container.appendChild(handle);
                handle.addEventListener("mousedown", (event) => {
                  editor.commands.setNodeSelection(pos);
                });

                return [
                  Decoration.widget(pos + 1, container),
                  ...(isNodeSelection(editor.state.selection)
                    ? [Decoration.node(pos, pos + 1, { draggable: "true" })]
                    : [])
                ];
              })
            );
          }
        }
      })
    ];
  }
}).configure({ HTMLAttributes: { class: "relative group" } });

export * from "./code-block";
export * from "./element";
export * from "./task-item";
export * from "./list-item";
export * from "./embed";
export * from "./image";
export * from "./document";
export * from "./heading";
export * from "./table";
export * from "./table-cell";
export * from "./table-header";
export * from "./marks";
export * from "./comment";
export * from "./horizontal-rule";
export * from "./node-input-rule";
export * from "./node-paste-rule";
export * from "./inline-element";
export { HardBreak } from "@tiptap/extension-hard-break";
export { Text } from "@tiptap/extension-text";
export { Blockquote } from "@tiptap/extension-blockquote";
export { BulletList } from "@tiptap/extension-bullet-list";
export { OrderedList } from "@tiptap/extension-ordered-list";
export { TaskList } from "@tiptap/extension-task-list";
export { TableRow } from "@tiptap/extension-table-row";
export { BaseParagraph as Paragraph };
