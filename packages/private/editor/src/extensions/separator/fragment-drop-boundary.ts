import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { dropPoint } from "@tiptap/pm/transform";
import type { EditorView } from "@tiptap/pm/view";

interface DragCoordinates {
  x: number;
  y: number;
}
interface FragmentEndBoundary {
  insidePos: number;
  outside: boolean;
  outsidePos: number;
}
interface FragmentTarget {
  node: ProseMirrorNode;
  pos: number;
}
interface GeometryCache {
  clearFrame: number | null;
  rects: WeakMap<Element, DOMRect>;
}

const geometryCaches = new WeakMap<EditorView, GeometryCache>();
const getGeometryCache = (view: EditorView): GeometryCache => {
  let cache = geometryCaches.get(view);

  if (!cache) {
    cache = {
      clearFrame: null,
      rects: new WeakMap()
    };
    geometryCaches.set(view, cache);
  }

  if (cache.clearFrame === null) {
    cache.clearFrame = requestAnimationFrame(() => {
      cache.clearFrame = null;
      cache.rects = new WeakMap();
    });
  }

  return cache;
};
const getFragmentDropRect = (view: EditorView, element: Element): DOMRect => {
  const cache = getGeometryCache(view);
  let rect = cache.rects.get(element);

  if (!rect) {
    rect = element.getBoundingClientRect();
    cache.rects.set(element, rect);
  }

  return rect;
};
const getDragDropPoint = (view: EditorView, pos: number): number => {
  return view.dragging?.slice ? (dropPoint(view.state.doc, pos, view.dragging.slice) ?? pos) : pos;
};
const getFollowingSeparator = (
  nodeDOM: HTMLElement,
  selector = "[data-structure-separator]"
): HTMLElement | null => {
  const sibling = nodeDOM.nextElementSibling;

  if (!(sibling instanceof HTMLElement)) return null;
  if (sibling.matches(selector)) return sibling;

  return sibling.querySelector<HTMLElement>(selector);
};
const getLastChildDOM = (
  view: EditorView,
  fragment: ProseMirrorNode,
  fragmentPos: number
): HTMLElement | null => {
  const lastChild = fragment.lastChild;
  const lastChildPos = lastChild
    ? fragmentPos + 1 + fragment.content.size - lastChild.nodeSize
    : -1;
  const lastChildDOM = lastChildPos >= 0 ? view.nodeDOM(lastChildPos) : null;

  return lastChildDOM instanceof HTMLElement ? lastChildDOM : null;
};
const getFragmentTarget = (node: ProseMirrorNode | null, pos: number): FragmentTarget | null => {
  return node?.type.name === "fragment" ? { node, pos } : null;
};
const getNearbyFragments = (view: EditorView, pos: number): FragmentTarget[] => {
  const { doc } = view.state;
  const $pos = doc.resolve(pos);
  const targets = new Map<number, FragmentTarget>();
  const addTarget = (target: FragmentTarget | null) => {
    if (target) targets.set(target.pos, target);
  };

  if ($pos.depth > 0) {
    const topLevelPos = $pos.before(1);
    const topLevelNode = $pos.node(1);
    const topLevelIndex = $pos.index(0);
    const previousNode = topLevelIndex > 0 ? doc.child(topLevelIndex - 1) : null;
    const nextNode = topLevelIndex + 1 < doc.childCount ? doc.child(topLevelIndex + 1) : null;

    addTarget(getFragmentTarget(topLevelNode, topLevelPos));
    addTarget(
      getFragmentTarget(previousNode, previousNode ? topLevelPos - previousNode.nodeSize : -1)
    );
    addTarget(getFragmentTarget(nextNode, nextNode ? topLevelPos + topLevelNode.nodeSize : -1));
  } else {
    const before = $pos.nodeBefore;
    const after = $pos.nodeAfter;

    addTarget(getFragmentTarget(before, before ? pos - before.nodeSize : -1));
    addTarget(getFragmentTarget(after, after ? pos : -1));
  }

  return Array.from(targets.values());
};
const isPointerInFragmentSplit = (view: EditorView, pos: number, y: number): boolean => {
  const before = view.state.doc.resolve(pos).nodeBefore;
  const beforePos = before ? pos - before.nodeSize : -1;
  const beforeDOM = beforePos >= 0 ? view.nodeDOM(beforePos) : null;
  const lastChildDOM = before ? getLastChildDOM(view, before, beforePos) : null;
  const separator =
    beforeDOM instanceof HTMLElement
      ? getFollowingSeparator(beforeDOM, "[data-fragment-drop-split]")
      : null;

  if (!separator) return false;

  const separatorRect = getFragmentDropRect(view, separator);
  const lastChildRect = lastChildDOM ? getFragmentDropRect(view, lastChildDOM) : null;
  const top = Math.min(separatorRect.top, lastChildRect?.bottom ?? separatorRect.top);

  return y >= top - 2 && y <= separatorRect.bottom + 2;
};
const getFragmentEndBoundary = (
  view: EditorView,
  pos: number,
  y: number
): FragmentEndBoundary | null => {
  const fragments = getNearbyFragments(view, pos);

  for (const fragment of fragments) {
    const fragmentDOM = view.nodeDOM(fragment.pos);
    const lastChildDOM = getLastChildDOM(view, fragment.node, fragment.pos);
    const separator =
      fragmentDOM instanceof HTMLElement
        ? getFollowingSeparator(
            fragmentDOM,
            "[data-fragment-end-boundary]:not([data-fragment-drop-split])"
          )
        : null;

    if (!separator || !lastChildDOM) continue;

    const separatorRect = getFragmentDropRect(view, separator);
    const lastChildRect = getFragmentDropRect(view, lastChildDOM);
    const top = Math.min(lastChildRect.bottom, separatorRect.top);

    if (y < top - 2 || y > separatorRect.bottom + 2) continue;

    return {
      insidePos: fragment.pos + fragment.node.nodeSize - 1,
      outside: y > separatorRect.top + separatorRect.height / 2,
      outsidePos: fragment.pos + fragment.node.nodeSize
    };
  }

  return null;
};

export {
  getDragDropPoint,
  getFollowingSeparator,
  getFragmentDropRect,
  getFragmentEndBoundary,
  isPointerInFragmentSplit
};
export type { DragCoordinates };
