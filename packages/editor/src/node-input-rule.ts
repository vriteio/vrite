import { ExtendedRegExpMatchArray, InputRule, InputRuleFinder } from "@tiptap/core";
import { NodeType } from "@tiptap/pm/model";

const nodeInputRule = (config: {
  find: InputRuleFinder;
  type: NodeType;
  getAttributes: (match: ExtendedRegExpMatchArray) => Record<string, any>;
}): InputRule => {
  return new InputRule({
    find: config.find,
    handler: ({ state, range, match }) => {
      const attributes = config.getAttributes(match);
      const { tr } = state;
      const start = range.from;

      let end = range.to;

      if (match[1]) {
        let matchStart = start;

        if (matchStart > end) {
          matchStart = end;
        } else {
          end = matchStart + match[1].length;
        }

        const lastChar = match[0][match[0].length - 1];

        tr.insertText(lastChar, start + match[0].length - 1);
        tr.replaceWith(matchStart - 1, end, config.type.create(attributes));
      } else if (match[0]) {
        tr.replaceWith(start, end, config.type.create(attributes));
      }
    }
  });
};

export { nodeInputRule };
