import type { Editor } from "@tiptap/core";
import { getCachedElementRect, type BlockControlTarget } from "#editor/ui/block-control-targeting";
import { LIST_ITEM_TYPES } from "#editor/ui/constants";

type ListTarget = BlockControlTarget & { list: HTMLElement };
const getList = (target: BlockControlTarget): HTMLElement | null => {
  const parent = target.dom.parentElement;

  return parent?.matches("ul, ol") ? parent : null;
};

const createListItemTargetResolver = (editor: Editor, getPointerY: () => number) => {
  let lastTarget: ListTarget | null = null;

  const getTarget = (element: HTMLElement): BlockControlTarget | null => {
    const contentPos = editor.view.posAtDOM(element, 0);

    for (const pos of [contentPos - 1, contentPos]) {
      const node = pos >= 0 ? editor.state.doc.nodeAt(pos) : null;

      if (node && LIST_ITEM_TYPES.has(node.type.name)) return { dom: element, node, pos };
    }

    return null;
  };
  const getDeepestList = (): HTMLElement | null => {
    const y = getPointerY();
    const lists = Array.from(editor.view.dom.querySelectorAll<HTMLElement>("ul, ol")).filter(
      (list) => {
        const rect = getCachedElementRect(editor, list);

        return y >= rect.top && y <= rect.bottom;
      }
    );

    return (
      lists.find((list) => !lists.some((other) => other !== list && list.contains(other))) || null
    );
  };
  const getNearestTarget = (list: HTMLElement): BlockControlTarget | null => {
    const y = getPointerY();
    const distance = (element: HTMLElement) => {
      const rect = getCachedElementRect(editor, element);

      return y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    };
    const item = Array.from(list.children)
      .filter((element): element is HTMLElement => {
        return element instanceof HTMLElement && element.matches("li");
      })
      .reduce<HTMLElement | null>((nearest, candidate) => {
        return !nearest || distance(candidate) < distance(nearest) ? candidate : nearest;
      }, null);

    return item ? getTarget(item) : null;
  };
  const resolve = (candidate: BlockControlTarget | null): BlockControlTarget | null => {
    if (!candidate) {
      lastTarget = null;
      return null;
    }

    const deepestList = getDeepestList();
    let target = candidate;

    if (deepestList && getList(candidate) !== deepestList) {
      target =
        lastTarget?.list === deepestList ? lastTarget : getNearestTarget(deepestList) || candidate;
    }

    const list = getList(target);

    if (list) lastTarget = { ...target, list };
    else if (!deepestList) lastTarget = null;

    return target;
  };

  return { reset: () => (lastTarget = null), resolve };
};

export { createListItemTargetResolver };
