import { EditorState, Plugin, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Extension, isNodeSelection } from "@tiptap/core";
import { Client } from "#context";

interface AutocompleteOptions {
  client: Client | null;
}
interface AutocompleteStorage {
  autocompletion?: string;
  element?: HTMLElement | null;
}

const autocompleteDecoration = (
  state: EditorState | Transaction,
  client: Client | null,
  storage: AutocompleteStorage
): { decoration: DecorationSet; cancel(): void } | null => {
  const { selection } = state;
  const { parent } = selection.$from;
  const endOfParagraphPos =
    selection.$from.pos - selection.$from.parentOffset + parent.nodeSize - 2;

  let element: HTMLElement | null = null;

  if (
    parent.type.name !== "paragraph" ||
    selection.$from.pos !== endOfParagraphPos ||
    parent.nodeSize === 2
  ) {
    return null;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    if (state instanceof Transaction && state.getMeta("autocompletion")) {
      return;
    }

    const sentences = (parent.textContent || "").split(/(?<=\w)\. /g);
    const lastSentence = sentences.at(-1);

    if (!lastSentence?.trim() || !lastSentence?.match(/^(?:.|\n)+?(\w|\s)$/g)) return;

    const paragraph = sentences.at(-1) || "";
    const contextSentences = sentences.slice(0, -1).join(". ");

    let context = "";

    state.doc.nodesBetween(0, Math.max(selection.$from.pos, 0), (previousNode) => {
      if (previousNode !== parent && context.length < 512) {
        context = `${context}\n${previousNode.textContent || ""}`;
      }

      if (previousNode.type.name === "heading") {
        context = `${previousNode.textContent}`;
      }

      return false;
    });
    context = `${context}\n${contextSentences}`.trim();
    client?.utils.autocomplete
      .mutate(
        {
          context,
          paragraph
        },
        { signal: controller.signal }
      )
      .then((response) => {
        storage.autocompletion = response.autocompletion;

        if (element) {
          element.textContent = response.autocompletion;
        }
      })
      .catch(() => {});
  }, 350);
  const cancel = (): void => {
    controller.abort();
    clearTimeout(timeoutHandle);
  };
  const decoration = DecorationSet.create(state.doc, [
    Decoration.widget(state.selection.from, () => {
      const span = storage.element || document.createElement("span");

      span;
      span.textContent = "";
      span.setAttribute("class", "opacity-30");
      span.setAttribute("contenteditable", "false");

      if (state instanceof Transaction && state.getMeta("autocompletion")) {
        span.textContent = storage.autocompletion || "";
      }

      element = span;
      storage.element = span;

      return span;
    })
  ]);

  return { decoration, cancel };
};
const AutocompletePlugin = Extension.create<AutocompleteOptions, AutocompleteStorage>({
  addOptions() {
    return { client: null };
  },
  addStorage() {
    return {
      autocompletion: "",
      element: null
    };
  },
  addKeyboardShortcuts() {
    const handlePartialCompletion = (editor: SolidEditor): boolean => {
      const autocompletion = this.storage.autocompletion || "";

      if (autocompletion) {
        const { tr } = editor.state;
        const { dispatch } = editor.view;
        const { $from } = editor.state.selection;
        const endOfParagraphPos = $from.pos - $from.parentOffset + $from.parent.nodeSize - 2;
        const words = autocompletion.split(" ");

        this.storage.autocompletion = words.slice(1).join(" ");
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
        const autocompletion = this.storage.autocompletion || "";

        if (autocompletion) {
          const { tr } = editor.state;
          const { dispatch } = editor.view;
          const { $from } = editor.state.selection;
          const endOfParagraphPos = $from.pos - $from.parentOffset + $from.parent.nodeSize - 2;

          this.storage.autocompletion = "";
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
            return autocompleteDecoration(state, options.client, storage);
          },
          apply(tr, previousValue, oldState) {
            const selectionPosChanged = tr.selection.from !== oldState.selection.from;

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

            return autocompleteDecoration(tr, options.client, storage);
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
