import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { DecorationSet, Decoration } from "@tiptap/pm/view";

const Placeholder = Extension.create({
  name: "placeholder",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("placeholder"),
        props: {
          decorations(state) {
            const { doc } = state;

            if (
              doc.childCount == 1 &&
              doc.firstChild?.type.name === "paragraph" &&
              doc.firstChild?.content.size == 0
            ) {
              return DecorationSet.create(doc, [
                Decoration.node(0, 2, { "data-placeholder": "Write away...", "class": "is-empty" })
              ]);
            }
          }
        }
      })
    ];
  }
});

export { Placeholder };
