import { markInputRule, markPasteRule } from "@tiptap/core";
import { Code as BaseCode } from "@tiptap/extension-code";

const Code = BaseCode.extend({
  exitable: true,
  addInputRules() {
    return [
      markInputRule({
        find: /((?:`)((?:[^`]+))(?:`))$/,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: /((?:`)((?:[^`]+))(?:`))/g,
        type: this.type
      })
    ];
  }
});

export { Code };
