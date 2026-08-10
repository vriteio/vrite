import type { CommandProps, Editor, KeyboardShortcutCommand, Range } from "@tiptap/core";
import { PluginKey, Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { isNodeRangeSelection, NodeRange, NodeRangeSelection } from "@tiptap/extension-node-range";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockSelection: {
      setBlockSelection: (position: Range) => ReturnType;
    };
  }
}

const BlockSelection = NodeRangeSelection;
const isBlockSelection = isNodeRangeSelection;
const setBlockSelectionAtCoords = (
  editor: Editor,
  coords: { left: number; top: number }
): boolean => {
  const { doc, selection } = editor.state;
  const { pos } = editor.view.posAtCoords(coords) || {};

  if (typeof pos !== "number") return false;

  const resolvedPos = doc.resolve(pos);
  const node = resolvedPos.node(1) || resolvedPos.nodeAfter;

  if (!node) return false;

  const from = resolvedPos.start(1);
  const to = from + node.nodeSize - 2;

  if (!(isBlockSelection(selection) && selection.from <= from && selection.to >= to)) {
    editor.chain().setBlockSelection({ from, to }).run();
  }

  return true;
};
const BlockSelectionExtension = NodeRange.extend({
  name: "blockSelection",
  priority: 1000,
  addProseMirrorPlugins() {
    const editor = this.editor;
    const parentPlugins = (this as unknown as { parent?: () => Plugin[] }).parent?.() || [];

    return [
      ...parentPlugins,
      new Plugin({
        key: new PluginKey("blockSelection"),
        props: {
          handleDOMEvents: {
            contextmenu(view, event) {
              if (
                !setBlockSelectionAtCoords(editor, {
                  left: event.clientX,
                  top: event.clientY
                })
              ) {
                return false;
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
              if (node.type.name === "title" || node.type.isInGroup("block")) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "block-selection-marker" })
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
      setBlockSelection(position: Range) {
        return ({ tr }: CommandProps) => {
          tr.setSelection(
            new BlockSelection(tr.doc.resolve(position.from), tr.doc.resolve(position.to))
          );

          return true;
        };
      }
    };
  },
  addKeyboardShortcuts() {
    const parentShortcuts =
      (this as unknown as { parent?: () => Record<string, KeyboardShortcutCommand> }).parent?.() ||
      {};

    return {
      ...parentShortcuts,
      "Mod-a": ({ editor }: Parameters<KeyboardShortcutCommand>[0]) => {
        const { state } = editor;
        const { selection, doc } = state;
        const resolvedPos = selection.$from;
        const depth = resolvedPos.depth > 0 ? 1 : 0;
        const currentNode = resolvedPos.node(depth);
        const titleNode = doc.firstChild;

        if (!titleNode) return false;

        const titleRange = {
          from: 1,
          to: titleNode.nodeSize - 1
        };
        const contentRange = {
          from: titleNode.nodeSize + 1,
          to: doc.content.size - 1
        };
        const documentRange = {
          from: titleRange.from,
          to: contentRange.to
        };
        const coversRange = (range: Range) => {
          return selection.from <= range.from && selection.to >= range.to;
        };

        // Title: title block -> entire document.
        if (currentNode?.type.name === "title") {
          const range =
            isBlockSelection(selection) && coversRange(titleRange) ? documentRange : titleRange;

          if (isBlockSelection(selection) && coversRange(range)) return true;

          return editor.chain().setBlockSelection(range).run();
        }

        // Content: current block -> all content without the title -> entire document.
        if (isBlockSelection(selection)) {
          const range = coversRange(contentRange) ? documentRange : contentRange;

          if (coversRange(range)) return true;

          return editor.chain().setBlockSelection(range).run();
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

export { BlockSelectionExtension as BlockSelection, isBlockSelection, setBlockSelectionAtCoords };
