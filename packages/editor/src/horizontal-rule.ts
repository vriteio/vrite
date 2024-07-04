import { nodeInputRule } from "./node-input-rule";
import { nodePasteRule } from "./node-paste-rule";
import { HorizontalRule as BaseHorizontalRule } from "@tiptap/extension-horizontal-rule";

const HorizontalRule = BaseHorizontalRule.extend({
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
