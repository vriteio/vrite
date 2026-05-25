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

              if (!node) return false;

              const from = resolvedPos.start(1);
              const to = from + (node.nodeSize || 0) - 2;

              // If block selection already covers this node, keep existing selection
              if (!(isBlockSelection(selection) && selection.from <= from && selection.to >= to)) {
                editor.chain().setBlockSelection({ from, to }).focus().run();
              }

              event.preventDefault();

              return true;
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
  },
  addKeyboardShortcuts() {
    return {
      "Mod-a": ({ editor }) => {
        const { state } = editor;
        const { selection, doc } = state;
        const resolvedPos = selection.$from;
        const depth = resolvedPos.depth > 0 ? 1 : 0;
        const currentNode = resolvedPos.node(depth);

        // In title node: always select all text within the title
        if (currentNode?.type.name === "title") {
          const from = resolvedPos.start(depth);
          const to = from + currentNode.nodeSize - 2;

          return editor.commands.setTextSelection({ from, to });
        }

        // If block selection already covers current block(s), expand to entire doc (excluding title)
        if (isBlockSelection(selection)) {
          const titleNode = doc.firstChild;

          if (!titleNode) return false;

          const contentFrom = titleNode.nodeSize + 1;
          const contentTo = doc.content.size - 1;
          const alreadyFull = selection.from <= contentFrom && selection.to >= contentTo;

          if (alreadyFull) return true;

          return editor.chain().setBlockSelection({ from: contentFrom, to: contentTo }).run();
        }

        // First press: block-select current node
        if (!currentNode) return false;

        const from = resolvedPos.start(depth);
        const to = from + currentNode.nodeSize - 2;

        return editor.chain().setBlockSelection({ from, to }).run();
      }
    };
  }
});

export { BlockSelectionExtension as BlockSelection, isBlockSelection };
