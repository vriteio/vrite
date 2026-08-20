import { getSelectionRanges, NodeRangeSelection } from "@tiptap/extension-node-range";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection, type SelectionRange } from "@tiptap/pm/state";

interface DragTarget {
  node: ProseMirrorNode;
  pos: number;
}

const getCSSText = (element: Element): string => {
  const style = getComputedStyle(element);
  let value = "";

  for (let index = 0; index < style.length; index += 1) {
    value += `${style[index]}:${style.getPropertyValue(style[index])};`;
  }

  return value;
};
const cloneElement = (element: HTMLElement): HTMLElement => {
  const clone = element.cloneNode(true) as HTMLElement;
  const sourceElements = [element, ...Array.from(element.getElementsByTagName("*"))];
  const clonedElements = [clone, ...Array.from(clone.getElementsByTagName("*"))];

  sourceElements.forEach((source, index) => {
    const clonedElement = clonedElements[index];

    if (clonedElement instanceof HTMLElement) clonedElement.style.cssText = getCSSText(source);
  });

  return clone;
};
const getDraggedElement = (editor: Editor, pos: number): HTMLElement | null => {
  const { view } = editor;
  const nodeDOM = view.nodeDOM(pos);

  if (nodeDOM instanceof HTMLElement && nodeDOM !== view.dom) return nodeDOM;

  const { node, offset } = view.domAtPos(pos);
  const child = node.childNodes[offset];

  if (child instanceof HTMLElement) return child;
  if (node instanceof HTMLElement) return node;
  if (node.nodeType === Node.TEXT_NODE) return node.parentElement;

  return null;
};
const getTargetRanges = (editor: Editor, target: DragTarget): SelectionRange[] => {
  const { doc } = editor.state;

  return [
    {
      $from: doc.resolve(target.pos),
      $to: doc.resolve(target.pos + target.node.nodeSize)
    }
  ];
};
const rangesMatch = (first: SelectionRange, second: SelectionRange): boolean => {
  return first.$from.pos === second.$from.pos && first.$to.pos === second.$to.pos;
};
const setDragPreview = (
  event: DragEvent,
  editor: Editor,
  ranges: SelectionRange[]
): (() => void) => {
  const wrapper = document.createElement("div");
  const firstElement = getDraggedElement(editor, ranges[0].$from.pos);
  const direction = firstElement ? getComputedStyle(firstElement).direction : "ltr";
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;

    cleanedUp = true;
    wrapper.remove();
    document.removeEventListener("drop", cleanup);
    document.removeEventListener("dragend", cleanup);
  };

  wrapper.dir = direction || "ltr";
  wrapper.style.position = "absolute";
  wrapper.style.top = "-10000px";

  ranges.forEach((range) => {
    const element = getDraggedElement(editor, range.$from.pos);

    if (!element) return;

    const clone = cloneElement(element);

    clone.style.margin = "0";
    wrapper.append(clone);
  });

  document.body.append(wrapper);
  event.dataTransfer?.setDragImage(wrapper, direction === "rtl" ? wrapper.offsetWidth : 0, 0);

  return cleanup;
};
const dragTarget = (event: DragEvent, editor: Editor, target: DragTarget): boolean => {
  const { view } = editor;
  const { $from, $to, empty } = view.state.selection;
  const targetRanges = getTargetRanges(editor, target);
  const selectionRanges = getSelectionRanges($from, $to, 0, {
    extendOnBoundaryOverlap: false
  });
  const usesSelection =
    !empty &&
    selectionRanges.some((range) =>
      targetRanges.some((targetRange) => rangesMatch(range, targetRange))
    );
  const ranges = usesSelection ? selectionRanges : targetRanges;
  const from = ranges[0]?.$from.pos;
  const to = ranges[ranges.length - 1]?.$to.pos;

  if (!event.dataTransfer || from === undefined || to === undefined) return false;

  const selection =
    usesSelection || ranges.length > 1
      ? NodeRangeSelection.create(view.state.doc, from, to)
      : NodeSelection.create(view.state.doc, from);
  const slice =
    selection instanceof NodeSelection ? view.state.doc.slice(from, to) : selection.content();
  const nodeSelection = selection instanceof NodeSelection ? selection : undefined;

  event.dataTransfer.clearData();
  const cleanupPreview = setDragPreview(event, editor, ranges);

  view.dragging = { slice, move: true, node: nodeSelection } as typeof view.dragging;
  view.dispatch(view.state.tr.setSelection(selection));
  document.addEventListener("drop", cleanupPreview);
  document.addEventListener("dragend", cleanupPreview);

  return true;
};

export { dragTarget };
export type { DragTarget };
