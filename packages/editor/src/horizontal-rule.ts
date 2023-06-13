import { nodePasteRule } from "./node-paste-rule";
import { HorizontalRule as BaseHorizontalRule } from "@tiptap/extension-horizontal-rule";

const HorizontalRule = BaseHorizontalRule.extend({
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
