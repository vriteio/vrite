import { Extension } from "@tiptap/core";
import { dropCursor } from "@tiptap/pm/dropcursor";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import {
  getDragDropPoint,
  getFollowingSeparator,
  getFragmentDropRect,
  getFragmentEndBoundary,
  isPointerInFragmentSplit,
  type DragCoordinates
} from "./separator/fragment-drop-boundary";
import { getActiveFragmentSplitPos } from "./separator/plugin-state";

interface DropCursorBoundary {
  edge: "bottom" | "top";
  pos: number;
  separatorAfter?: boolean;
}
interface DropCursorAlignmentCache {
  cursor: HTMLElement | null;
  editorScaleY: number | null;
}

const getDropCursorBoundary = (
  view: EditorView,
  coordinates: DragCoordinates
): DropCursorBoundary | null => {
  const activeSplitPos = getActiveFragmentSplitPos(view.state);
  const usesActiveSplit =
    activeSplitPos !== null && isPointerInFragmentSplit(view, activeSplitPos, coordinates.y);
  const position = usesActiveSplit
    ? null
    : view.posAtCoords({ left: coordinates.x, top: coordinates.y });
  const fragmentEnd = position ? getFragmentEndBoundary(view, position.pos, coordinates.y) : null;
  let target = usesActiveSplit ? activeSplitPos : position?.pos;

  if (fragmentEnd) {
    const insideDropPoint = getDragDropPoint(view, fragmentEnd.insidePos);
    const dropsInsideFragment =
      view.state.doc.resolve(insideDropPoint).parent.type.name === "fragment";

    target = fragmentEnd.outside || !dropsInsideFragment ? fragmentEnd.outsidePos : insideDropPoint;
  }

  if (typeof target !== "number") return null;

  if (!usesActiveSplit && !fragmentEnd && view.dragging?.slice) {
    target = getDragDropPoint(view, target);
  }

  const $target = view.state.doc.resolve(target);

  if ($target.parent.type.name === "fragment") {
    const before = $target.nodeBefore;
    const after = $target.nodeAfter;

    if (after) return { edge: "top", pos: target };
    if (before) return { edge: "bottom", pos: target - before.nodeSize };

    return null;
  }

  if ($target.depth !== 0) return null;

  const before = $target.nodeBefore;
  const after = $target.nodeAfter;
  const startsFragment = after?.type.name === "fragment";
  const startsPropertySection = after?.type.name === "property" && before?.type.name !== "property";
  const endsPropertySection = before?.type.name === "property" && after?.type.name !== "property";
  const endsFragment = before?.type.name === "fragment";

  if (startsPropertySection && after) {
    return { edge: "top", pos: target };
  }

  if (endsFragment && before) {
    return { edge: "bottom", pos: target - before.nodeSize, separatorAfter: true };
  }

  if (startsFragment && after) {
    return { edge: "top", pos: target };
  }

  if (endsPropertySection && before) {
    return { edge: "bottom", pos: target - before.nodeSize };
  }

  return null;
};
const getDropCursorElement = (
  view: EditorView,
  cache: DropCursorAlignmentCache
): HTMLElement | null => {
  if (cache.cursor?.isConnected) return cache.cursor;

  cache.cursor = view.dom.offsetParent?.querySelector<HTMLElement>(":scope > .drop-cursor") ?? null;

  return cache.cursor;
};
const getEditorScaleY = (view: EditorView, cache: DropCursorAlignmentCache): number | null => {
  if (cache.editorScaleY !== null) return cache.editorScaleY;

  const editorHeight = view.dom.offsetHeight;

  if (!editorHeight) return null;

  const scale = view.dom.getBoundingClientRect().height / editorHeight;

  if (!Number.isFinite(scale) || scale === 0) return null;

  cache.editorScaleY = scale;

  return scale;
};
const alignDropCursor = (
  view: EditorView,
  boundary: DropCursorBoundary | null,
  cache: DropCursorAlignmentCache
): void => {
  if (!boundary) return;

  const cursor = getDropCursorElement(view, cache);
  const nodeDOM = view.nodeDOM(boundary.pos);

  if (!cursor || !(nodeDOM instanceof HTMLElement)) return;

  const cursorRect = getFragmentDropRect(view, cursor);
  const separator = boundary.separatorAfter ? getFollowingSeparator(nodeDOM) : null;
  const edgeElement = separator ?? nodeDOM;
  const edgeRect = getFragmentDropRect(view, edgeElement);
  const currentTop = Number.parseFloat(cursor.style.top);
  const editorScaleY = getEditorScaleY(view, cache);
  const cursorCenter = cursorRect.top + cursorRect.height / 2;
  const alignsBottom = Boolean(separator) || boundary.edge === "bottom";
  const edge = alignsBottom ? edgeRect.bottom : edgeRect.top;

  if (!Number.isFinite(currentTop) || editorScaleY === null) return;

  cursor.style.top = `${currentTop + (edge - cursorCenter) / editorScaleY}px`;
};
const createStructureDropCursorAlignmentPlugin = (): Plugin => {
  return new Plugin({
    view(view) {
      let frame: number | null = null;
      let pendingCoordinates: DragCoordinates | null = null;
      const cache: DropCursorAlignmentCache = {
        cursor: null,
        editorScaleY: null
      };
      const invalidateScale = () => {
        cache.editorScaleY = null;
      };
      const resizeObserver =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(invalidateScale);

      const handleDragOver = (event: DragEvent) => {
        pendingCoordinates = { x: event.clientX, y: event.clientY };

        if (frame !== null) return;

        frame = requestAnimationFrame(() => {
          const coordinates = pendingCoordinates;

          frame = null;
          pendingCoordinates = null;
          if (!coordinates) return;

          alignDropCursor(view, getDropCursorBoundary(view, coordinates), cache);
        });
      };

      resizeObserver?.observe(view.dom);
      window.addEventListener("resize", invalidateScale);
      view.dom.addEventListener("dragover", handleDragOver);

      return {
        destroy() {
          if (frame !== null) cancelAnimationFrame(frame);
          resizeObserver?.disconnect();
          window.removeEventListener("resize", invalidateScale);
          view.dom.removeEventListener("dragover", handleDragOver);
        }
      };
    }
  });
};
const Dropcursor = Extension.create({
  name: "dropCursor",
  addProseMirrorPlugins() {
    return [dropCursor({ class: "drop-cursor" }), createStructureDropCursorAlignmentPlugin()];
  }
});

export { Dropcursor };
