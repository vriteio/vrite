import { markInputRule, markPasteRule } from "@tiptap/core";
import { Bold as BaseBold } from "@tiptap/extension-bold";
import { Italic as BaseItalic } from "@tiptap/extension-italic";
import { Strike as BaseStrike } from "@tiptap/extension-strike";
import { Code as BaseCode } from "@tiptap/extension-code";
import { Link as BaseLink } from "@tiptap/extension-link";
import { Highlight as BaseHighlight } from "@tiptap/extension-highlight";
import { Subscript as BaseSubscript } from "@tiptap/extension-subscript";
import { Superscript as BaseSuperscript } from "@tiptap/extension-superscript";

const Bold = BaseBold.extend({
  exitable: true,
  priority: 200,
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
const Link = BaseLink.extend({
  exitable: true
}).configure({
  openOnClick: false,
  validate(url) {
    return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:");
  }
});
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
const Subscript = BaseSubscript.extend({
  exitable: true
});
const Superscript = BaseSuperscript.extend({
  exitable: true
});

export { Bold, Italic, Strike, Code, Link, Highlight, Subscript, Superscript };
