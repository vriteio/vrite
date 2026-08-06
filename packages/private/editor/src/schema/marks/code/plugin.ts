/*
 * Cursor navigation is adapted from Curvenote's prosemirror-codemark.
 * Copyright (c) 2022 Curvenote Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import type { MarkType, Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

interface CodeMarkCursorPluginOptions {
  markType: MarkType;
  activeClass?: string;
  cursorClass?: string;
  insideCursorClass?: string;
  maxSelectedTextLength?: number;
}

type CodeCursorState = {
  active?: boolean;
  inside?: boolean;
  side?: -1 | 0;
  next?: true;
} | null;

type CodeCursorMeta = {
  action: "click" | "next";
};

const codeCursorPluginKey = new PluginKey<CodeCursorState>("codeMarkCursor");

const safeResolve = (doc: ProseMirrorNode, position: number) => {
  return doc.resolve(Math.min(Math.max(1, position), doc.nodeSize - 2));
};

const codeCursorState = (state: EditorState) => codeCursorPluginKey.getState(state);

/**
 * Mark the next transaction as one which should leave the code mark. The browser
 * still performs the actual cursor movement for keys such as Home and ArrowUp.
 */
const leaveCodeAfterNextTransaction = (
  view: EditorView,
  action: CodeCursorMeta["action"] = "next"
) => {
  view.dispatch(view.state.tr.setMeta(codeCursorPluginKey, { action } satisfies CodeCursorMeta));

  return false;
};

const removeCodeStoredMarkAtBoundary = (state: EditorState, markType: MarkType) => {
  const { selection, doc } = state;

  if (!selection.empty) return null;

  const storedCode = !!markType.isInSet(state.storedMarks || []);
  const codeBefore = !!markType.isInSet(selection.$from.marks());
  const codeAfter = !!markType.isInSet(safeResolve(doc, selection.from + 1).marks());
  const atStartOfTextblock = selection.$from.parentOffset === 0;

  if (
    codeBefore !== codeAfter ||
    (!codeBefore && storedCode !== codeBefore) ||
    (codeBefore && atStartOfTextblock)
  ) {
    return state.tr.removeStoredMark(markType);
  }

  return null;
};

const handleBacktick = (
  view: EditorView,
  event: KeyboardEvent,
  markType: MarkType,
  maxSelectedTextLength: number
) => {
  const { selection } = view.state;

  if (
    selection.empty ||
    event.metaKey ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    selection.to - selection.from >= maxSelectedTextLength ||
    view.state.doc.rangeHasMark(selection.from, selection.to, markType)
  ) {
    return false;
  }

  const transaction = view.state.tr.addMark(selection.from, selection.to, markType.create());

  view.dispatch(
    transaction
      .setSelection(TextSelection.create(transaction.doc, selection.to))
      .removeStoredMark(markType)
  );

  return true;
};

const handleArrowRightInside = (view: EditorView, event: KeyboardEvent, markType: MarkType) => {
  if (event.metaKey) return leaveCodeAfterNextTransaction(view);
  if (event.shiftKey || event.altKey || event.ctrlKey) return false;

  const { selection, doc } = view.state;

  if (!selection.empty) return false;

  const cursor = codeCursorState(view.state);
  const position = selection.$from;
  const codeBefore = !!markType.isInSet(position.marks());
  const codeAfter = !!markType.isInSet(safeResolve(doc, selection.from + 1).marks());

  if (
    position.pos === doc.nodeSize - 3 &&
    position.parentOffset === position.parent.nodeSize - 2 &&
    cursor?.active
  ) {
    view.dispatch(view.state.tr.removeStoredMark(markType));
    return true;
  }

  if (codeBefore === codeAfter && position.parentOffset !== 0) return false;

  if (codeBefore && (!cursor?.active || cursor.side === -1) && position.parentOffset !== 0) {
    // `code|` -> `code`|
    view.dispatch(view.state.tr.removeStoredMark(markType));
    return true;
  }

  if (codeAfter && cursor?.active && cursor.side === -1) {
    // |`code` -> `|code`
    view.dispatch(view.state.tr.addStoredMark(markType.create()));
    return true;
  }

  return false;
};

const handleArrowRight = (view: EditorView, event: KeyboardEvent, markType: MarkType) => {
  if (handleArrowRightInside(view, event, markType)) return true;

  const { selection } = view.state;
  const position = selection.$from;

  if (selection.empty && position.parentOffset === position.parent.nodeSize - 2) {
    return leaveCodeAfterNextTransaction(view);
  }

  return false;
};

const handleArrowLeftInside = (view: EditorView, event: KeyboardEvent, markType: MarkType) => {
  if (event.metaKey) return leaveCodeAfterNextTransaction(view);
  if (event.shiftKey || event.altKey || event.ctrlKey) return false;

  const { selection, doc } = view.state;
  const cursor = codeCursorState(view.state);
  const codeBefore = !!markType.isInSet(selection.$from.marks());
  const codeToLeft = !!markType.isInSet(
    safeResolve(doc, selection.empty ? selection.from - 1 : selection.from + 1).marks()
  );

  if (codeBefore && cursor?.active && cursor.side === -1 && selection.$from.parentOffset === 0) {
    return false;
  }

  if (cursor?.active && cursor.side === 0 && selection.$from.parentOffset === 0) {
    view.dispatch(view.state.tr.removeStoredMark(markType));
    return true;
  }

  if (codeBefore && codeToLeft && cursor?.active && cursor.side === 0) {
    // `code`| -> `code|`
    view.dispatch(view.state.tr.addStoredMark(markType.create()));
    return true;
  }

  if (codeBefore && !codeToLeft && cursor?.active && selection.$from.parentOffset === 0) {
    view.dispatch(view.state.tr.removeStoredMark(markType));
    return true;
  }

  if (!codeBefore && cursor?.active && cursor.side === 0) {
    // `|code` -> |`code`
    view.dispatch(view.state.tr.removeStoredMark(markType));
    return true;
  }

  if (codeBefore === codeToLeft) return false;

  if (codeToLeft || (!selection.empty && codeBefore)) {
    const from = selection.empty ? selection.from - 1 : selection.from;
    const transaction = view.state.tr.setSelection(TextSelection.create(doc, from));

    view.dispatch(
      !selection.empty && codeToLeft
        ? transaction.addStoredMark(markType.create())
        : transaction.removeStoredMark(markType)
    );
    return true;
  }

  if (codeBefore && !cursor?.active && selection.$from.parentOffset > 0) {
    view.dispatch(
      view.state.tr
        .setSelection(TextSelection.create(doc, selection.from - 1))
        .addStoredMark(markType.create())
    );
    return true;
  }

  if (codeBefore && !codeToLeft && cursor?.active && cursor.side !== -1) {
    view.dispatch(view.state.tr.addStoredMark(markType.create()));
    return true;
  }

  if (codeBefore && !codeToLeft && cursor?.active) {
    const position = selection.from - 1;

    view.dispatch(
      view.state.tr
        .setSelection(TextSelection.create(doc, position))
        .addStoredMark(markType.create())
    );
    return true;
  }

  return false;
};

const handleArrowLeft = (view: EditorView, event: KeyboardEvent, markType: MarkType) => {
  if (handleArrowLeftInside(view, event, markType)) return true;

  const { selection } = view.state;
  const position = selection.$from;
  const cursor = codeCursorState(view.state);

  if (position.pos === 1 && position.parentOffset === 0 && cursor?.active && cursor.side === -1) {
    return true;
  }

  if (selection.empty && position.parentOffset === 0) {
    return leaveCodeAfterNextTransaction(view);
  }

  return false;
};

const handleBackspace = (view: EditorView, event: KeyboardEvent, markType: MarkType) => {
  if (event.metaKey || event.shiftKey || event.altKey || event.ctrlKey) return false;

  const { selection, doc } = view.state;
  const from = safeResolve(doc, selection.from - 1);
  const codeBefore = !!markType.isInSet(from.marks());
  const atStartOfTextblock = from.parentOffset === 0;
  const codeAfter = !!markType.isInSet(safeResolve(doc, selection.to + 1).marks());

  if ((!codeBefore || atStartOfTextblock) && !codeAfter) {
    return leaveCodeAfterNextTransaction(view);
  }

  // Firefox can delete the boundary widget instead of the preceding character.
  const cursor = codeCursorState(view.state);

  if (selection.empty && cursor?.active && cursor.side === -1) {
    view.dispatch(view.state.tr.delete(selection.from - 1, selection.from));
    return true;
  }

  return false;
};

const handleDelete = (view: EditorView, event: KeyboardEvent, markType: MarkType) => {
  if (event.metaKey || event.shiftKey || event.altKey || event.ctrlKey) return false;

  const { selection, doc } = view.state;
  const codeBefore = !!markType.isInSet(selection.$from.marks());
  const atStartOfTextblock = selection.$from.parentOffset === 0;
  const codeAfter = !!markType.isInSet(safeResolve(doc, selection.to + 2).marks());

  if ((!codeBefore || atStartOfTextblock) && !codeAfter) {
    return leaveCodeAfterNextTransaction(view);
  }

  return false;
};

const createCursor = (inside: boolean, cursorClass: string, insideCursorClass: string) => {
  return () => {
    const cursor = document.createElement("span");
    cursor.classList.add(cursorClass);

    if (inside) cursor.classList.add(insideCursorClass);

    cursor.setAttribute("aria-hidden", "true");

    return cursor;
  };
};

const createCodeMarkCursorPlugin = ({
  markType,
  activeClass = "code-mark-cursor-active",
  cursorClass = "code-mark-cursor",
  insideCursorClass = "code-mark-cursor--inside",
  maxSelectedTextLength = 100
}: CodeMarkCursorPluginOptions) => {
  return new Plugin<CodeCursorState>({
    key: codeCursorPluginKey,
    appendTransaction: (transactions, oldState, newState) => {
      const previous = codeCursorPluginKey.getState(oldState);
      const clicked = transactions.some(
        (transaction) =>
          (transaction.getMeta(codeCursorPluginKey) as CodeCursorMeta | undefined)?.action ===
          "click"
      );

      if (previous?.next || clicked) {
        return removeCodeStoredMarkAtBoundary(newState, markType);
      }

      return null;
    },
    state: {
      init: () => null,
      apply: (transaction, _previous, _oldState, state) => {
        const meta = transaction.getMeta(codeCursorPluginKey) as CodeCursorMeta | undefined;

        if (meta?.action === "next") return { next: true };
        if (!transaction.selection.empty) return null;

        const { selection } = transaction;
        const nextMark = markType.isInSet(
          state.storedMarks || state.doc.resolve(selection.from).marks()
        );
        const codeBefore = markType.isInSet(state.doc.resolve(selection.from).marks());
        const codeAfter = markType.isInSet(safeResolve(state.doc, selection.from + 1).marks());
        const atStartOfTextblock = selection.$from.parentOffset === 0;

        if (!nextMark && codeAfter && (!codeBefore || atStartOfTextblock)) {
          return { active: true, inside: false, side: -1 };
        }
        if (nextMark && (!codeBefore || atStartOfTextblock)) {
          return { active: true, inside: true, side: 0 };
        }
        if (!nextMark && codeBefore && !codeAfter) {
          return { active: true, inside: false, side: 0 };
        }
        if (nextMark && codeBefore && !codeAfter) {
          return { active: true, inside: true, side: -1 };
        }

        return null;
      }
    },
    props: {
      attributes: (state): Record<string, string> => {
        return codeCursorPluginKey.getState(state)?.active ? { class: activeClass } : {};
      },
      decorations: (state) => {
        const cursor = codeCursorPluginKey.getState(state);

        if (!cursor?.active) return DecorationSet.empty;

        return DecorationSet.create(state.doc, [
          Decoration.widget(
            state.selection.from,
            createCursor(!!cursor.inside, cursorClass, insideCursorClass),
            { side: cursor.side }
          )
        ]);
      },
      handleKeyDown: (view, event) => {
        switch (event.key) {
          case "`":
            return handleBacktick(view, event, markType, maxSelectedTextLength);
          case "ArrowRight":
            return handleArrowRight(view, event, markType);
          case "ArrowLeft":
            return handleArrowLeft(view, event, markType);
          case "Backspace":
            return handleBackspace(view, event, markType);
          case "Delete":
            return handleDelete(view, event, markType);
          case "ArrowUp":
          case "ArrowDown":
          case "Home":
          case "End":
            return leaveCodeAfterNextTransaction(view);
          case "a":
          case "e":
            return event.ctrlKey ? leaveCodeAfterNextTransaction(view) : false;
          default:
            return false;
        }
      },
      handleClick: (view) => leaveCodeAfterNextTransaction(view, "click")
    }
  });
};

export { createCodeMarkCursorPlugin };
export type { CodeMarkCursorPluginOptions };
