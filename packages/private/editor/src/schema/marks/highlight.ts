import { markInputRule, markPasteRule } from "@tiptap/core";
import { Highlight as BaseHighlight } from "@tiptap/extension-highlight";

const Highlight = BaseHighlight.extend({
  exitable: true,
  addInputRules() {
    return [
      markInputRule({
        find: /((?:==)((?:[^~=]+))(?:==))$/,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: /((?:==)((?:[^~=]+))(?:==))/g,
        type: this.type
      })
    ];
  }
});

export { Highlight };
