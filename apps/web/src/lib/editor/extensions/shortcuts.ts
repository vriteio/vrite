import { AllSelection, TextSelection } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import { useNotifications } from "#context";

const Shortcuts = Extension.create({
  addKeyboardShortcuts() {
    const { notify } = useNotifications();

    return {
      "Tab": () => {
        return true;
      },
      "Shift-Tab": () => {
        return true;
      },
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
  }
});

export { Shortcuts };
