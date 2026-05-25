import { Extension, isTextSelection, Range } from "@tiptap/core";
import { ResolvedPos } from "@tiptap/pm/model";
import { TextSelection, PluginKey, Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockSelection: {
      setBlockSelection: (position: Range) => ReturnType;
    };
  }
}

class BlockSelection extends TextSelection {
  public constructor($anchor: ResolvedPos, $head?: ResolvedPos) {
    super($anchor, $head);
  }
}

const isBlockSelection = (value: unknown): value is BlockSelection => {
  return value instanceof BlockSelection;
};
const BlockSelectionExtension = Extension.create({
  name: "blockSelection",
  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey("blockSelection"),
        props: {
          handleDOMEvents: {
            contextmenu(view, event) {
              const { doc, selection } = view.state;
              const { pos } = view.posAtCoords({ left: event.clientX, top: event.clientY }) || {};

              if (typeof pos !== "number") return false;

              const resolvedPos = doc.resolve(pos);
              const node = resolvedPos.node(1) || resolvedPos.nodeAfter;
              const from = resolvedPos.start(1);
              const to = from + (node?.nodeSize || 0) - 2;
              const selectionsOverlap = selection.from <= to && selection.to >= from;

              if (!node) return false;

              if (
                node &&
                (!isTextSelection(selection) || selection.empty) &&
                (!isBlockSelection(selection) || !selectionsOverlap)
              ) {
                editor
                  .chain()
                  .setBlockSelection({
                    from,
                    to
                  })
                  .focus()
                  .run();
                event.preventDefault();
                event.stopPropagation();
                return true;
              }
            }
          },
          decorations(state) {
            const { doc, selection } = state;
            const { from, to } = selection;
            const decorations: Decoration[] = [];
            if (!isBlockSelection(selection)) return null;

            doc.nodesBetween(from, to, (node, pos) => {
              if (node.type.isInGroup("block")) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "block-selection" })
                );

                return false;
              }

              return true;
            });

            return DecorationSet.create(state.doc, decorations);
          }
        }
      })
    ];
  },
  addCommands() {
    return {
      setBlockSelection(position) {
        return ({ tr }) => {
          tr.setSelection(
            new BlockSelection(tr.doc.resolve(position.from), tr.doc.resolve(position.to))
          );

          return true;
        };
      }
    };
  }
});

export { BlockSelectionExtension as BlockSelection, isBlockSelection };
