import { markInputRule, markPasteRule } from "@tiptap/core";
import { Bold as BaseBold } from "@tiptap/extension-bold";
import { Italic as BaseItalic } from "@tiptap/extension-italic";
import { Strike as BaseStrike } from "@tiptap/extension-strike";
import { Code as BaseCode } from "@tiptap/extension-code";
import { Link as BaseLink } from "@tiptap/extension-link";
import { Highlight as BaseHighlight } from "@tiptap/extension-highlight";
import { Subscript as BaseSubscript } from "@tiptap/extension-subscript";
import { Superscript as BaseSuperscript } from "@tiptap/extension-superscript";
import { Underline as BaseUnderline } from "@tiptap/extension-underline";

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
        getAttrs: (value) => /^(bold(er)?|[7-9]\d{2,})$/.test(value as string) && null
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
  exitable: true,
  inclusive: true,
  addOptions() {
    return {
      linkOnPaste: true,
      autolink: true,
      protocols: [],
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        class: null
      },
      openOnClick: false,
      validate(url) {
        return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:");
      }
    };
  },
  parseHTML() {
    return [{ tag: 'a[href]:not([href ^= "javascript:" i])' }];
  },
  addInputRules() {
    return [
      markInputRule({
        find: /\[(.+?)]\(.+?\)$/,
        type: this.type.schema.marks.link,
        getAttributes({ input = "" }: RegExpMatchArray) {
          const [wrappedUrl] = input.match(/\(.+?\)/) || [];
          const url = wrappedUrl ? wrappedUrl.slice(1, -1) : 0;

          return {
            href: url || ""
          };
        }
      })
    ];
  },
  addPasteRules() {
    return [
      ...(this.parent?.() || []),
      markPasteRule({
        find: /\[(.+?)]\(.+?\)/g,
        type: this.type.schema.marks.link,
        getAttributes({ input = "" }: RegExpMatchArray) {
          const [wrappedUrl] = input.match(/\(.+?\)/) || [];
          const url = wrappedUrl ? wrappedUrl.slice(1, -1) : 0;

          return {
            href: url || ""
          };
        }
      })
    ];
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
const Underline = BaseUnderline.extend({
  exitable: true
});

export { Bold, Italic, Strike, Code, Link, Highlight, Subscript, Superscript, Underline };
