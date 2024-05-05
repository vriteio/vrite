import { Autocomplete } from "./ui";
import { EditorState, Transaction } from "@tiptap/pm/state";
import { DecorationSet, Decoration } from "@tiptap/pm/view";
import { Client } from "#context";

const autocompleteDecoration = (
  state: EditorState | Transaction,
  client: Client | null,
  autocomplete: Autocomplete,
  options?: {
    textAddition?: string;
  }
): { decoration: DecorationSet; cancel(): void } | null => {
  const { selection } = state;
  const { parent } = selection.$from;
  const autocompletion =
    autocomplete
      .content()
      ?.slice(
        autocomplete.content().indexOf(options?.textAddition || "") +
          (options?.textAddition || "").length
      ) || "";

  if (options?.textAddition) {
    autocomplete.setContent(autocompletion);
    autocomplete.setParent(parent);

    const decoration = DecorationSet.create(state.doc, [
      Decoration.widget(state.selection.from, () => {
        return autocomplete.element;
      })
    ]);

    return { decoration, cancel: () => {} };
  }

  const endOfParagraphPos =
    selection.$from.pos - selection.$from.parentOffset + parent.nodeSize - 2;

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

    const parentContent = parent.textContent || "";
    const sentences = parentContent.split(/(?<=\w)\. /g);
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
        autocomplete.setContent(response.autocompletion);
        autocomplete.setParent(parent);
      })
      .catch(() => {});
  }, 350);
  const cancel = (): void => {
    controller.abort();
    clearTimeout(timeoutHandle);
  };
  const decoration = DecorationSet.create(state.doc, [
    Decoration.widget(state.selection.from, () => {
      return autocomplete.element;
    })
  ]);

  return { decoration, cancel };
};

export { autocompleteDecoration };
