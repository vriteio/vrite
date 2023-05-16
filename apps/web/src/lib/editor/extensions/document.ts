import { markInputRule } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import { useNotificationsContext } from "#context";

const CustomDocument = Document.extend({
  content: "block+",
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
  }
});

export { CustomDocument };
