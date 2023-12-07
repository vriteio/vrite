import { Extension } from "@tiptap/core";
import { isNodeSelection } from "@tiptap/core";
import { Node } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { breakpoints } from "#lib/utils";
import { dragVerticalIcon } from "#assets/icons/drag-vertical";

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

            const paragraphs: Array<{ pos: number; node: Node }> = [];

            state.doc.descendants((node, pos) => {
              if (
                ["paragraph", "blockquote", "bulletList", "orderedList", "taskList"].includes(
                  node.type.name
                )
              ) {
                paragraphs.push({ pos, node });
              }

              return false;
            });

            return DecorationSet.create(
              state.doc,
              paragraphs.flatMap(({ pos, node }) => {
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
                container.style.paddingTop = "5px";
                container.style.left = "-1.5rem";
                handle.style.fill = "currentColor";
                handle.setAttribute("viewBox", "0 0 24 24");
                path.setAttribute("stroke", "currentColor");
                path.setAttribute("stroke-linecap", "round");
                path.setAttribute("stroke-linejoin", "round");
                path.setAttribute("stroke-width", "2");
                path.setAttribute("d", dragVerticalIcon);
                handle.appendChild(path);
                container.appendChild(handle);
                handle.addEventListener("mousedown", () => {
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
