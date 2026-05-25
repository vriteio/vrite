import { markInputRule, markPasteRule } from "@tiptap/core";
import { Strike as BaseStrike } from "@tiptap/extension-strike";

const Strike = BaseStrike.extend({
  exitable: true,
  addInputRules() {
    return [
      markInputRule({
        find: /((?:~~)((?:[^~]+))(?:~~))$/,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: /((?:~~)((?:[^~]+))(?:~~))/g,
        type: this.type
      })
    ];
  }
});

export { Strike };
