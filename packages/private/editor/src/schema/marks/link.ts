import { markInputRule, markPasteRule } from "@tiptap/core";
import { Link as BaseLink } from "@tiptap/extension-link";
import { validateURL } from "#editor/lib";

const Link = BaseLink.extend({
  exitable: true,
  inclusive: true,
  priority: 100,
  addOptions() {
    return {
      linkOnPaste: true,
      autolink: true,
      protocols: [],
      defaultProtocol: "http",
      enableClickSelection: false,
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        class: null
      },
      openOnClick: false,
      validate: (url) => Boolean(validateURL(url)),
      isAllowedUri: (url) => Boolean(validateURL(url)),
      shouldAutoLink: (url) => Boolean(validateURL(url))
    };
  },
  parseHTML() {
    return [
      {
        tag: "a[href]",
        getAttrs: (element) => {
          return validateURL((element as HTMLElement).getAttribute("href") || "") ? null : false;
        }
      }
    ];
  },
  addInputRules() {
    return [
      markInputRule({
        find: /\[(.+?)]\(.+?\)$/,
        type: this.type.schema.marks.link,
        getAttributes({ input = "" }: RegExpMatchArray) {
          const [wrappedUrl] = input.match(/\(.+?\)/) || [];
          const href = validateURL(wrappedUrl ? wrappedUrl.slice(1, -1) : "");

          return href ? { href } : null;
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
          const href = validateURL(wrappedUrl ? wrappedUrl.slice(1, -1) : "");

          return href ? { href } : null;
        }
      })
    ];
  }
});

export { Link };
