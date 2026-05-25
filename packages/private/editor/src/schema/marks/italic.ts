import { markInputRule, markPasteRule } from "@tiptap/core";
import { Italic as BaseItalic } from "@tiptap/extension-italic";

const Italic = BaseItalic.extend({
  exitable: true,
  priority: 100,
  addInputRules() {
    return [
      markInputRule({
        find: /(?:^|\s)((?:\*)((?:[^*]+))(?:\*))$/,
        type: this.type
      }),
      markInputRule({
        find: /((?:_)((?:[^_]+))(?:_))$/,
        type: this.type
      }),
      markInputRule({
        find: /(?:^|\s)((?:_)((?:[^_]+))(?:_))$/,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: /((?:\*)((?:[^*]+))(?:\*))/g,
        type: this.type
      }),
      markPasteRule({
        find: /((?:_)((?:[^_]+))(?:_))/g,
        type: this.type
      })
    ];
  }
});

export { Italic };
