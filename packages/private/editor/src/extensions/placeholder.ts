import { Extension, isNodeEmpty } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorMode } from "#editor/client-types";

interface PlaceholderOptions {
  mode: EditorMode;
}

const getPlaceholder = (mode: EditorMode, insideFragment: boolean): string => {
  if (mode === "entry") {
    return "Write, type / to add blocks";
  }

  if (insideFragment) {
    return "Add default content, type / to add blocks";
  }

  return "Type / to add schema properties and fragments";
};
const Placeholder = Extension.create<PlaceholderOptions>({
  name: "placeholder",
  addOptions() {
    return { mode: "entry" };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          decorations: (state) => {
            const desktop = window.matchMedia("(min-width: 768px)").matches;

            if (!editor.isEditable || !desktop) return null;

            const decorations: Decoration[] = [];
            const emptyDocument = isNodeEmpty(state.doc);
            const { anchor } = state.selection;

            state.doc.descendants((node, pos) => {
              if (!node.isTextblock || !isNodeEmpty(node)) return true;

              const entryTitle = this.options.mode === "entry" && node.type.name === "title";
              const focused = editor.isFocused && anchor >= pos && anchor <= pos + node.nodeSize;

              if (!entryTitle && !focused) return true;

              // The editor state can still contain the previous document during dispatch.
              const resolvedPosition = state.doc.resolve(pos);

              let insideFragment = false;
              let insideInheritedField = false;

              for (let depth = resolvedPosition.depth; depth > 0; depth -= 1) {
                const parent = resolvedPosition.node(depth);

                if (parent.attrs.inherited) {
                  insideInheritedField = true;
                  break;
                }

                if (parent.type.name === "fragment") {
                  insideFragment = true;
                }
              }

              if (insideInheritedField) return true;

              decorations.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  "class": emptyDocument ? "is-empty is-editor-empty" : "is-empty",
                  "data-placeholder":
                    node.type.name === "title"
                      ? "New entry"
                      : getPlaceholder(this.options.mode, insideFragment)
                })
              );

              return true;
            });

            return DecorationSet.create(state.doc, decorations);
          }
        }
      })
    ];
  }
});
const createPlaceholder = (mode: EditorMode) => {
  return Placeholder.configure({ mode });
};

export { createPlaceholder, Placeholder };
