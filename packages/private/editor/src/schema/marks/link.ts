import { markInputRule, markPasteRule } from "@tiptap/core";
import { Link as BaseLink, isAllowedUri } from "@tiptap/extension-link";

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
      HTMLAttributes: {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        class: null
      },
      openOnClick: false,
      validate(url) {
        return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:");
      },
      isAllowedUri: (url, ctx) => Boolean(isAllowedUri(url, ctx.protocols)),
      shouldAutoLink: (url) => Boolean(url)
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
        // eslint-disable-next-line sonarjs/no-identical-functions
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

export { Link };
