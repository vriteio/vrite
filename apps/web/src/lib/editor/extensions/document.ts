import { Document as BaseDocument } from "@vrite/editor";
import { AllSelection, EditorState, Plugin, TextSelection, Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { SolidEditor } from "@vrite/tiptap-solid";
import { isNodeSelection } from "@tiptap/core";
import { Client, useNotifications } from "#context";

interface DocumentOptions {
  client: Client | null;
}
interface DocumentStorage {
  autocompletion?: string;
  element?: HTMLElement | null;
}

const autocompleteDecoration = (
  state: EditorState | Transaction,
  client: Client | null,
  storage: DocumentStorage
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
const Document = BaseDocument.extend<DocumentOptions, DocumentStorage>({
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
    const { notify } = useNotifications();
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
      "Mod-ArrowRight": ({ editor }) => handlePartialCompletion(editor as SolidEditor),
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

export { Document };
