import { markInputRule, markPasteRule } from "@tiptap/core";
import { Code as BaseCode } from "@tiptap/extension-code";
import { createCodeMarkCursorPlugin } from "./plugin";

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
  },
  addProseMirrorPlugins() {
    return [createCodeMarkCursorPlugin({ markType: this.type })];
  }
});

export { Code, createCodeMarkCursorPlugin };
export type { CodeMarkCursorPluginOptions } from "./plugin";
