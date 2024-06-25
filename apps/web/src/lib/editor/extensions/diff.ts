import { mdiCircleOutline, mdiMinus, mdiPlus } from "@mdi/js";
import { Mark } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const Diff = Mark.create({
  name: "diff",
  addAttributes() {
    return {
      diff: {
        rendered: false
      }
    };
  },
  renderHTML({ mark }) {
    return ["span", mark.attrs.diff ? { "data-highlight-diff": mark.attrs.diff } : {}, 0];
  },
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "bulletList",
          "orderedList",
          "taskList",
          "blockquote",
          "horizontalRule",
          "image",
          "codeBlock",
          "element",
          "table",
          "tableRow",
          "tableCell",
          "tableHeader",
          "heading",
          "listItem",
          "taskItem"
        ],
        attributes: {
          diff: { rendered: false, default: null }
        }
      }
    ];
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("diff-highlighter"),
        props: {
          decorations: (state) => {
            const { doc } = state;
            const decorations: Decoration[] = [];

            doc.descendants((node, pos) => {
              if (node.attrs.diff) {
                const decoration = Decoration.node(pos, pos + node.nodeSize, {
                  "data-highlight-diff": node.attrs.diff
                });
                const container = document.createElement("span");
                const handle = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                let icon = mdiCircleOutline;

                if (node.attrs.diff === "added") {
                  icon = mdiPlus;
                } else if (node.attrs.diff === "removed") {
                  icon = mdiMinus;
                }

                container.setAttribute("data-widget", "diffIndicator");
                container.setAttribute("data-highlight-diff", node.attrs.diff);
                handle.setAttribute("viewBox", "0 0 24 24");
                path.setAttribute("stroke", "currentColor");
                path.setAttribute("d", icon);
                handle.appendChild(path);
                container.appendChild(handle);

                if (node.type.name !== "image") {
                  container.classList.add("top-0");
                }

                decorations.push(decoration);
              }

              return true;
            });

            return DecorationSet.create(doc, decorations);
          }
        }
      })
    ];
  }
});

export { Diff };
