import { ElementSelection, isElementSelection } from "./element/selection";
import { customViews } from "./element";
import { AllSelection, TextSelection, NodeSelection } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { useNotifications } from "#context";

const Shortcuts = Extension.create({
  priority: 10000,
  addKeyboardShortcuts() {
    const { notify } = useNotifications();
    const { editor } = this;

    return {
      "Tab": () => {
        return true;
      },
      "Shift-Tab": () => {
        return true;
      },
      "Mod-z": () => {
        return editor.commands.undoInputRule();
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
        const { doc, tr, selection } = this.editor.state;
        const { dispatch } = this.editor.view;
        const getProperElementSelection = (
          startingDepth: number,
          currentSelection: ElementSelection
        ): ElementSelection => {
          const uid =
            (
              editor.view.nodeDOM(selection.$from.before(startingDepth)) as HTMLElement
            )?.getAttribute("data-uid") || "";

          if (uid) {
            const customView = customViews.get(uid);

            if (customView) {
              for (let depth = startingDepth; depth > 0; depth--) {
                const parent = selection.$from.node(depth);

                if (
                  parent.type.name === "element" &&
                  parent.attrs.type.toLowerCase() === customView.type
                ) {
                  return ElementSelection.create(
                    doc,
                    selection.$from.before(Math.max(depth, 1)),
                    false
                  );
                }
              }
            }
          }

          return currentSelection;
        };

        if (selection.$from.depth) {
          const currentDepth = selection.$from.depth;

          if (isElementSelection(selection) && selection.node.type.name === "element") {
            const newDepth = Math.max(currentDepth, 1);
            const newSelection = getProperElementSelection(
              newDepth,
              ElementSelection.create(doc, selection.$from.before(newDepth), false)
            );

            dispatch(tr.setSelection(newSelection));
          } else {
            const newDepth = Math.max(
              currentDepth - (selection instanceof CellSelection ? 2 : 1),
              1
            );

            let newSelection = NodeSelection.create(doc, selection.$from.before(newDepth));

            if (newSelection.node.type.name === "element") {
              newSelection = getProperElementSelection(
                newDepth,
                ElementSelection.create(doc, selection.$from.before(newDepth), false)
              );
            }

            dispatch(tr.setSelection(newSelection));
          }
        } else {
          if (selection instanceof AllSelection) {
            editor.commands.blur();
          }

          const fullSelection = new AllSelection(doc);

          dispatch(tr.setSelection(fullSelection));
        }

        return true;
      }
    };
  }
});

export { Shortcuts };
