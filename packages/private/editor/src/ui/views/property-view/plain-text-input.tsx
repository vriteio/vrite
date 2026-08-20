import clsx from "clsx";
import { type Component, createEffect } from "solid-js";

interface PlainTextInputProps {
  class?: string;
  placeholder?: string;
  value: string;
  onConfirm?(value: string): void;
}

const normalizePlainText = (value: string): string => {
  return value.replace(/[\r\n\u2028\u2029]+/g, " ");
};
const placeCaretAtEnd = (element: HTMLElement): void => {
  const range = document.createRange();
  const selection = window.getSelection();

  range.selectNodeContents(element);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
};
const normalizeContent = (element: HTMLElement): string => {
  const value = normalizePlainText(element.innerText);
  const containsOnlyText =
    !element.firstChild ||
    (element.childNodes.length === 1 && element.firstChild.nodeType === Node.TEXT_NODE);

  if (!containsOnlyText || element.textContent !== value) {
    element.textContent = value;
    placeCaretAtEnd(element);
  }

  return value;
};
const insertPlainText = (element: HTMLElement, value: string): void => {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const text = document.createTextNode(normalizePlainText(value));
  const selectionInsideElement = Boolean(range && element.contains(range.commonAncestorContainer));

  if (!range || !selectionInsideElement) {
    element.append(text);
    placeCaretAtEnd(element);
  } else {
    range.deleteContents();
    range.insertNode(text);
    range.setStartAfter(text);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  normalizeContent(element);
};

const PlainTextInput: Component<PlainTextInputProps> = (props) => {
  let inputRef: HTMLDivElement | undefined;

  createEffect(() => {
    const input = inputRef;
    const value = normalizePlainText(props.value);

    if (input && document.activeElement !== input && input.textContent !== value) {
      input.textContent = value;
    }
  });

  return (
    <div
      ref={inputRef}
      aria-label="Text property value"
      aria-multiline="false"
      contentEditable="plaintext-only"
      data-placeholder={props.placeholder || "Enter text"}
      role="textbox"
      class={clsx(
        "flex min-h-7 w-full min-w-0 flex-1 items-center justify-start break-words whitespace-pre-wrap rounded-lg bg-white p-1 px-2 text-[16px] leading-5 outline outline-1 outline-gray-200 shadow-md ring-offset-1 empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] focus:bg-gray-100 focus:outline-1 md:text-sm",
        props.class
      )}
      onBeforeInput={(event) => {
        const formattingInput = event.inputType.startsWith("format");
        const lineBreakInput = ["insertLineBreak", "insertParagraph"].includes(event.inputType);

        if (formattingInput || lineBreakInput) event.preventDefault();
      }}
      onInput={(event) => normalizeContent(event.currentTarget)}
      onPaste={(event) => {
        event.preventDefault();
        insertPlainText(event.currentTarget, event.clipboardData?.getData("text/plain") || "");
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        insertPlainText(event.currentTarget, event.dataTransfer?.getData("text/plain") || "");
      }}
      onBlur={(event) => props.onConfirm?.(normalizeContent(event.currentTarget))}
      onKeyDown={(event) => {
        event.stopPropagation();

        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
};

export { PlainTextInput };
