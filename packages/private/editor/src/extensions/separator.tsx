import { Extension } from "@tiptap/core";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

const Separator = Extension.create({
  name: "separator",
  addProseMirrorPlugins() {
    const plugin = new PluginKey(this.name);
    return [
      new Plugin({
        key: plugin,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, value) {
            if (!tr.docChanged) return value;

            const decorations: Decoration[] = [];

            tr.doc.forEach((node, pos) => {
              const nextNode = tr.doc.nodeAt(pos + node.nodeSize);

              if (["fragment", "property"].includes(node.type.name)) {
                if (!nextNode || !["fragment", "property"].includes(nextNode.type.name)) {
                  decorations.push(
                    Decoration.widget(pos + node.nodeSize, () => {
                      const separatorContainer = document.createElement("div");
                      const separator = document.createElement("div");

                      separatorContainer.className = "flex gap-2 items-center w-full h-4";
                      separator.className = "flex-1 bg-gray-200 h-px rounded-full";
                      separatorContainer.appendChild(separator);

                      console.log(node, nextNode, separatorContainer);
                      return separatorContainer;
                    })
                  );
                }
              }
              if (node.type.name !== "property" && nextNode?.type.name === "property") {
                decorations.push(
                  Decoration.widget(pos + node.nodeSize, () => {
                    const separatorContainer = document.createElement("div");
                    const separator = document.createElement("div");
                    const label = document.createElement("span");

                    separatorContainer.className = "flex gap-2 items-center w-full h-4";
                    separator.className = "flex-1 bg-gray-200 h-px rounded-full";
                    label.className = "text-xs text-gray-300";
                    label.textContent = "Properties";
                    separatorContainer.appendChild(label);
                    separatorContainer.appendChild(separator);

                    return separatorContainer;
                  })
                );
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});

export { Separator };
