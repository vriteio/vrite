import {
  InputRule,
  InputRuleFinder,
  ExtendedRegExpMatchArray,
  Range,
  callOrReturn
} from "@tiptap/core";
import { NodeType } from "@tiptap/pm/model";
import { Transaction } from "@tiptap/pm/state";

const nodeInputRule = (config: {
  find: InputRuleFinder;
  type: NodeType;
  getAttributes?:
    | Record<string, any>
    | ((match: ExtendedRegExpMatchArray) => Record<string, any>)
    | false
    | null;
  appendTransaction?(input: {
    tr: Transaction;
    attributes: Record<string, any>;
    range: Range;
  }): void;
}): InputRule => {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const attributes = callOrReturn(config.getAttributes, undefined, match) || {};
      const { tr } = state;
      const start = range.from;

      let end = range.to;

      const newNode = config.type.create(attributes);

      if (match[1]) {
        const offset = match[0].lastIndexOf(match[1]);

        let matchStart = start + offset;

        if (matchStart > end) {
          matchStart = end;
        } else {
          end = matchStart + match[1].length;
        }

        const lastChar = match[0][match[0].length - 1];

        tr.insertText(lastChar, start + match[0].length - 1);
        tr.replaceWith(matchStart - 1, end, newNode);
      } else if (match[0]) {
        tr.replaceWith(start, end, config.type.create(attributes)).delete(
          tr.mapping.map(start),
          tr.mapping.map(end)
        );
      }

      config.appendTransaction?.({
        tr,
        attributes,
        range
      });
      tr.scrollIntoView();
    }
  });
};

export { nodeInputRule };
