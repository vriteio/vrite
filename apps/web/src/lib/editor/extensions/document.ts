import { markInputRule, markPasteRule } from "@tiptap/core";
import { Document as BaseDocument } from "@vrite/editor";
import { useNotificationsContext } from "#context";
import { AllSelection, TextSelection } from "@tiptap/pm/state";

const Document = BaseDocument.extend({
  addKeyboardShortcuts() {
    const { notify } = useNotificationsContext() || {};

    return {
      "Mod-s": () => {
        notify?.({ text: "Vrite autosaves your content", type: "success" });

        return true;
      },

      "Mod-Shift-a": () => {
        const { doc, selection, tr } = this.editor.state;
        const { dispatch } = this.editor.view;
        const { $from, $to } = selection;
        const endPos = $from.node() === doc ? 0 : $from.after() - 1;
        const startPos = $to.node() === doc ? 0 : $to.before() + 1;
        const paragraphSelection = TextSelection.between(
          doc.resolve(startPos >= 0 ? startPos : 0),
          doc.resolve(endPos >= 0 ? endPos : 0)
        );

        dispatch(tr.setSelection(paragraphSelection));

        return true;
      },
      "Mod-a": () => {
        const { doc, tr } = this.editor.state;
        const { dispatch } = this.editor.view;
        const fullSelection = new AllSelection(doc);

        dispatch(tr.setSelection(fullSelection));

        return true;
      },
      "Escape": () => {
        const { doc, tr } = this.editor.state;
        const { dispatch } = this.editor.view;

        dispatch(tr.setSelection(TextSelection.atEnd(doc)));

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
