import { markInputRule, markPasteRule } from "@tiptap/core";
import { Bold as BaseBold } from "@tiptap/extension-bold";

const Bold = BaseBold.extend({
  exitable: true,
  priority: 200,
  parseHTML() {
    return [
      {
        tag: "strong"
      },
      {
        tag: "b",
        getAttrs: (node) => (node as HTMLElement).style.fontWeight !== "normal" && null
      },
      {
        style: "font-weight",
        getAttrs: (value) => {
          const matchBold = /^(bold(er)?|[7-9]\d{2,})$/;

          return matchBold.test(value as string) && null;
        }
      }
    ];
  },
  addInputRules() {
    return [
      markInputRule({
        find: /((?:\*\*)((?:.+))(?:\*\*))$/,
        type: this.type
      }),
      markInputRule({
        find: /((?:__)((?:.+))(?:__))$/,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      markPasteRule({
        find: /((?:\*\*)((?:.+))(?:\*\*))/g,
        type: this.type
      }),
      markPasteRule({
        find: /((?:__)((?:.+))(?:__))/g,
        type: this.type
      })
    ];
  }
});

export { Bold };
