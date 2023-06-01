import { PasteRuleFinder, ExtendedRegExpMatchArray, PasteRule, callOrReturn } from "@tiptap/core";
import { NodeType } from "@tiptap/pm/model";

const nodePasteRule = (config: {
  find: PasteRuleFinder;
  type: NodeType;
  getAttributes?:
    | Record<string, any>
    | ((match: ExtendedRegExpMatchArray) => Record<string, any>)
    | false
    | null;
  getContent?: string | ((match: ExtendedRegExpMatchArray) => string) | false | null;
}) => {
  return new PasteRule({
    find: config.find,
    handler({ match, chain, range }) {
      const attributes = callOrReturn(config.getAttributes, undefined, match);
      const content = callOrReturn(config.getContent, undefined, match);

      if (attributes === false || attributes === null || content === false || content === null) {
        return null;
      }

      if (match.input) {
        chain()
          .deleteRange(range)
          .insertContentAt(range.from, {
            type: config.type.name,
            attrs: attributes,
            ...(config.getContent && content && { content: [{ text: content, type: "text" }] })
          });
      }
    }
  });
};

export { nodePasteRule };
