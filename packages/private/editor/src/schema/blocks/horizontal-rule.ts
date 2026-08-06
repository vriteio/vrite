import { nodeInputRule, nodePasteRule } from "#editor/lib";
import { mergeAttributes } from "@tiptap/core";
import { HorizontalRule as BaseHorizontalRule } from "@tiptap/extension-horizontal-rule";

const HorizontalRule = BaseHorizontalRule.extend({
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "horizontal-rule"
      }),
      ["hr"]
    ];
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        type: this.type
      })
    ];
  },
  addPasteRules() {
    return [
      nodePasteRule({
        find: /^(?:---|—-|___|\*\*\*)\s*$/g,
        type: this.type
      })
    ];
  }
});

export { HorizontalRule };
