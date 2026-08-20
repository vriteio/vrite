import type { CommandProps, Editor, KeyboardShortcutCommand, Range } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { PluginKey, Plugin, type Selection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { isNodeRangeSelection, NodeRange, NodeRangeSelection } from "@tiptap/extension-node-range";
import { forEachSelectedBlock } from "#editor/ui/block-utils";

interface BlockSelectionRange extends Range {
  depth?: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockSelection: {
      setBlockSelection: (position: BlockSelectionRange) => ReturnType;
    };
  }
}

const BlockSelection = NodeRangeSelection;
const isBlockSelection = isNodeRangeSelection;
const createBlockRangeSelection = (
  doc: ProseMirrorNode,
  position: BlockSelectionRange
): NodeRangeSelection => {
  return new BlockSelection(doc.resolve(position.from), doc.resolve(position.to), position.depth);
};
const isFragmentChildBlockSelection = (selection: Selection): boolean => {
  return isBlockSelection(selection) && selection.depth === 1;
};
const isSameBlockSelection = (selection: Selection, nextSelection: NodeRangeSelection): boolean => {
  return (
    isBlockSelection(selection) &&
    selection.depth === nextSelection.depth &&
    selection.eq(nextSelection)
  );
};
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

            forEachSelectedBlock(
              doc,
              from,
              to,
              (node, pos) => {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: "block-selection-marker" })
                );
              },
              { includeCoveredFragments: !isFragmentChildBlockSelection(selection) }
            );

            return DecorationSet.create(state.doc, decorations);
          }
        }
      })
    ];
  },
  addCommands() {
    return {
      setBlockSelection(position: BlockSelectionRange) {
        return ({ tr }: CommandProps) => {
          const selection = createBlockRangeSelection(tr.doc, position);

          if (isSameBlockSelection(tr.selection, selection)) return true;

          tr.setSelection(selection);

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

export {
  BlockSelectionExtension as BlockSelection,
  createBlockRangeSelection,
  isBlockSelection,
  isFragmentChildBlockSelection,
  isSameBlockSelection,
  setBlockSelectionAtCoords
};
