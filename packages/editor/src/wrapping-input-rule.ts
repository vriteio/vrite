import {
  Editor,
  ExtendedRegExpMatchArray,
  InputRule,
  InputRuleFinder,
  Range,
  callOrReturn
} from "@tiptap/core";
import { canJoin, findWrapping } from "@tiptap/pm/transform";
import { Node as ProseMirrorNode, NodeType } from "@tiptap/pm/model";
import { Transaction } from "@tiptap/pm/state";

const wrappingInputRule = (config: {
  find: InputRuleFinder;
  type: NodeType;
  keepMarks?: boolean;
  keepAttributes?: boolean;
  editor?: Editor;
  getAttributes?:
    | Record<string, any>
    | ((match: ExtendedRegExpMatchArray) => Record<string, any>)
    | false
    | null;
  joinPredicate?: (match: ExtendedRegExpMatchArray, node: ProseMirrorNode) => boolean;
  appendTransaction?(input: {
    tr: Transaction;
    attributes: Record<string, any>;
    range: Range;
  }): void;
}): InputRule => {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match, chain }) => {
      const attributes = callOrReturn(config.getAttributes, undefined, match) || {};
      const tr = state.tr.delete(range.from, range.to);
      const $start = tr.doc.resolve(range.from);
      const blockRange = $start.blockRange();
      const wrapping = blockRange && findWrapping(blockRange, config.type, attributes);

      if (!wrapping) {
        return null;
      }

      tr.wrap(blockRange, wrapping);

      if (config.keepMarks && config.editor) {
        const { selection, storedMarks } = state;
        const { splittableMarks } = config.editor.extensionManager;
        const marks = storedMarks || (selection.$to.parentOffset && selection.$from.marks());

        if (marks) {
          const filteredMarks = marks.filter((mark) => splittableMarks.includes(mark.type.name));

          tr.ensureMarks(filteredMarks);
        }
      }

      if (config.keepAttributes) {
        let nodeType = "taskList";

        if (config.type.name === "bulletList" || config.type.name === "orderedList") {
          nodeType = "listItem";
        }

        chain().updateAttributes(nodeType, attributes).run();
      }

      const before = tr.doc.resolve(range.from - 1).nodeBefore;

      if (
        before &&
        before.type === config.type &&
        canJoin(tr.doc, range.from - 1) &&
        (!config.joinPredicate || config.joinPredicate(match, before))
      ) {
        tr.join(range.from - 1);
      }

      config.appendTransaction?.({ tr, range, attributes });
    }
  });
};

export { wrappingInputRule };
