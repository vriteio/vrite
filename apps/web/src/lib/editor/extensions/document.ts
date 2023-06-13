import { markInputRule, markPasteRule } from "@tiptap/core";
import { Document as BaseDocument } from "@vrite/editor";
import { useNotificationsContext } from "#context";

const Document = BaseDocument.extend({
  addKeyboardShortcuts() {
    const { notify } = useNotificationsContext() || {};

    return {
      "Mod-s": () => {
        notify?.({ text: "Vrite autosaves your content", type: "success" });

        return true;
      }
    };
  },
  addInputRules() {
    return [
      markInputRule({
        find: /\[(.+?)]\(.+?\)/,
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

export { Document };
