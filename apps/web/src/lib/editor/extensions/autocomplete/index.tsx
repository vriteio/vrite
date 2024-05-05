import { Autocomplete, createAutocomplete } from "./ui";
import { autocompleteDecoration } from "./decoration";
import { Plugin } from "@tiptap/pm/state";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Extension, isNodeSelection } from "@tiptap/core";
import { Client } from "#context";

interface AutocompleteOptions {
  client: Client | null;
}
interface AutocompleteStorage {
  autocomplete: Autocomplete;
}

const AutocompletePlugin = Extension.create<AutocompleteOptions, AutocompleteStorage>({
  addOptions() {
    return { client: null };
  },
  addStorage() {
    return {
      autocomplete: createAutocomplete()
    };
  },
  addKeyboardShortcuts() {
    const handlePartialCompletion = (editor: SolidEditor): boolean => {
      const autocompletion = this.storage.autocomplete.content() || "";

      if (autocompletion) {
        const { tr } = editor.state;
        const { dispatch } = editor.view;
        const { $from } = editor.state.selection;
        const endOfParagraphPos = $from.pos - $from.parentOffset + $from.parent.nodeSize - 2;
        const words = autocompletion.split(" ");

        this.storage.autocomplete.setContent(words.slice(1).join(" "));
        dispatch(
          tr
            .setMeta("autocompletion", true)
            .insertText(
              `${words[0]}${words.length > 1 ? " " : ""}`,
              endOfParagraphPos,
              endOfParagraphPos
            )
        );

        return true;
      }

      return false;
    };

    return {
      "Tab": ({ editor }) => {
        const autocompletion = this.storage.autocomplete.content() || "";

        if (autocompletion) {
          const { tr } = editor.state;
          const { dispatch } = editor.view;
          const { $from } = editor.state.selection;
          const endOfParagraphPos = $from.pos - $from.parentOffset + $from.parent.nodeSize - 2;

          this.storage.autocomplete.setContent("");
          dispatch(
            tr
              .setMeta("autocompletion", true)
              .insertText(autocompletion, endOfParagraphPos, endOfParagraphPos)
          );

          return true;
        }

        // Handle tab when at the end of a paragraph.
        return true;
      },
      "Shift-Tab": ({ editor }) => handlePartialCompletion(editor as SolidEditor),
      "Mod-ArrowRight": ({ editor }) => handlePartialCompletion(editor as SolidEditor)
    };
  },
  addProseMirrorPlugins() {
    const { options, storage, editor } = this;

    return [
      new Plugin({
        state: {
          init(_, state) {
            return autocompleteDecoration(state, options.client, storage.autocomplete);
          },
          apply(tr, previousValue, oldState) {
            const selectionPosChanged = tr.selection.from !== oldState.selection.from;
            const { selection } = tr;
            /* const { parent } = selection.$from;
            const priorTextContent = storage.autocomplete.parent()?.textContent || "";
            const priorTextStartIndex = parent.textContent.indexOf(priorTextContent);
            const textAddition = parent.textContent.slice(
              priorTextContent ? priorTextStartIndex + priorTextContent.length : 0
            );

            if (storage.autocomplete.content()?.startsWith(textAddition)) {
              previousValue?.cancel();

              return autocompleteDecoration(tr, options.client, storage.autocomplete, {
                textAddition
              });
            }*/

            if (
              (!(tr.selectionSet && selectionPosChanged) && !tr.docChanged) ||
              tr.getMeta("tableColumnResizing$") ||
              !tr.selection.empty ||
              isNodeSelection(tr.selection) ||
              !editor.isFocused
            ) {
              return previousValue || null;
            }

            previousValue?.cancel();
            storage.autocomplete.setContent("");

            return autocompleteDecoration(tr, options.client, storage.autocomplete);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state)?.decoration || null;
          }
        }
      })
    ];
  }
});

export { AutocompletePlugin };
