import type { Editor, EditorEvents } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { BLOCK_CONTROL_VIRTUAL_MARGIN_REM, LIST_ITEM_TYPES } from "./constants";

interface BlockControlTarget {
  dom: HTMLElement;
  node: ProseMirrorNode;
  pos: number;
}

type TargetRectName = "anchor" | "content" | "hover";
type TargetRects = Partial<Record<TargetRectName, DOMRect>>;
interface BlockControlRectCache {
  elements: WeakMap<HTMLElement, DOMRect>;
  fontSize?: number;
  scrollContainer: HTMLElement | null;
  targets: WeakMap<HTMLElement, TargetRects>;
}

const caches = new WeakMap<Editor, BlockControlRectCache>();

const createCache = (editor: Editor): BlockControlRectCache => {
  const scrollContainer = editor.view.dom.closest<HTMLElement>(
    "[data-editor-scrollable-container]"
  );
  const cache: BlockControlRectCache = {
    elements: new WeakMap(),
    scrollContainer,
    targets: new WeakMap()
  };
  const invalidate = () => {
    cache.elements = new WeakMap();
    cache.fontSize = undefined;
    cache.targets = new WeakMap();
  };
  const onTransaction = ({ transaction }: EditorEvents["transaction"]) => {
    if (transaction.docChanged) invalidate();
  };
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(invalidate);
  const destroy = () => {
    observer?.disconnect();
    window.removeEventListener("resize", invalidate);
    window.removeEventListener("scroll", invalidate);
    scrollContainer?.removeEventListener("scroll", invalidate);
    editor.off("transaction", onTransaction);
    editor.off("destroy", destroy);
    caches.delete(editor);
  };

  observer?.observe(editor.view.dom);

  if (scrollContainer) observer?.observe(scrollContainer);

  window.addEventListener("resize", invalidate);
  window.addEventListener("scroll", invalidate, { passive: true });
  scrollContainer?.addEventListener("scroll", invalidate, { passive: true });
  editor.on("transaction", onTransaction);
  editor.on("destroy", destroy);

  return cache;
};

const getCache = (editor: Editor): BlockControlRectCache => {
  let cache = caches.get(editor);

  if (!cache) {
    cache = createCache(editor);
    caches.set(editor, cache);
  }

  return cache;
};

const getCachedElementRect = (editor: Editor, element: HTMLElement): DOMRect => {
  const cache = getCache(editor);

  let rect = cache.elements.get(element);

  if (!rect) {
    rect = element.getBoundingClientRect();
    cache.elements.set(element, rect);
  }

  return rect;
};

const getCachedTargetRect = (
  editor: Editor,
  target: BlockControlTarget,
  name: TargetRectName,
  measure: () => DOMRect
): DOMRect => {
  const cache = getCache(editor);
  const targetRects = cache.targets.get(target.dom) || {};

  let rect = targetRects[name];

  if (!rect) {
    rect = measure();
    targetRects[name] = rect;
    cache.targets.set(target.dom, targetRects);
  }

  return rect;
};

const getEditorScrollContainer = (editor: Editor): HTMLElement | null => {
  return getCache(editor).scrollContainer;
};

const getTargetList = (target: BlockControlTarget): HTMLElement | null => {
  const parent = LIST_ITEM_TYPES.has(target.node.type.name) ? target.dom.parentElement : null;

  return parent?.matches("ul, ol") ? parent : null;
};

const getFirstLineRect = (editor: Editor, element: HTMLElement): DOMRect => {
  const elementRect = getCachedElementRect(editor, element);
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const caret = node.parentElement?.closest(
        ".collaboration-caret, .collaboration-caret__label"
      );

      return node.textContent?.trim() && !caret
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });
  const text = walker.nextNode();

  if (text?.textContent) {
    const range = document.createRange();

    range.setStart(text, 0);
    range.setEnd(text, Math.min(1, text.textContent.length));

    const rect = range.getClientRects()[0];

    if (rect) return new DOMRect(rect.x, rect.y, rect.width, rect.height);
  }

  const style = window.getComputedStyle(element);
  const parsedLineHeight = Number.parseFloat(style.lineHeight);

  return new DOMRect(
    elementRect.x,
    elementRect.y + (Number.parseFloat(style.paddingTop) || 0),
    elementRect.width,
    Number.isNaN(parsedLineHeight) ? 24 : parsedLineHeight
  );
};

const getBlockContentRect = (editor: Editor, target: BlockControlTarget): DOMRect => {
  return getCachedTargetRect(editor, target, "content", () => {
    const outerRect = getCachedElementRect(editor, target.dom);

    if (target.node.type.name === "horizontalRule") {
      const line = target.dom.matches("hr") ? target.dom : target.dom.querySelector("hr");

      return line instanceof HTMLElement ? getCachedElementRect(editor, line) : outerRect;
    }

    let textblockPos: number | null = target.node.isTextblock ? target.pos : null;

    target.node.descendants((node, pos) => {
      if (textblockPos !== null || !node.isTextblock) return textblockPos === null;

      textblockPos = target.pos + 1 + pos;
      return false;
    });

    const textblock = textblockPos === null ? null : editor.view.nodeDOM(textblockPos);

    return textblock instanceof HTMLElement ? getFirstLineRect(editor, textblock) : outerRect;
  });
};

const getBlockControlAnchorRect = (editor: Editor, target: BlockControlTarget): DOMRect => {
  return getCachedTargetRect(editor, target, "anchor", () => {
    const content = getBlockContentRect(editor, target);
    const horizontal = getCachedElementRect(editor, getTargetList(target) || target.dom);

    return new DOMRect(horizontal.x, content.y, horizontal.width, Math.max(1, content.height));
  });
};

const getBlockControlHoverRect = (editor: Editor, target: BlockControlTarget): DOMRect => {
  return getCachedTargetRect(editor, target, "hover", () => {
    const block = getCachedElementRect(editor, target.dom);
    const list = getTargetList(target);
    const vertical = list ? getCachedElementRect(editor, list) : block;
    let horizontal = block;

    if (list) {
      const $pos = editor.state.doc.resolve(target.pos);
      const topLevelDOM = editor.view.nodeDOM($pos.depth ? $pos.before(1) : target.pos);

      if (topLevelDOM instanceof HTMLElement) {
        horizontal = getCachedElementRect(editor, topLevelDOM);
      }
    }

    const scrollContainer = getEditorScrollContainer(editor);

    if (!scrollContainer) {
      return new DOMRect(horizontal.left, vertical.top, horizontal.width, vertical.height);
    }

    const cache = getCache(editor);
    const scroll = getCachedElementRect(editor, scrollContainer);

    cache.fontSize ??=
      Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;

    const margin = BLOCK_CONTROL_VIRTUAL_MARGIN_REM * cache.fontSize;
    const left = Math.min(margin, Math.max(0, horizontal.left - scroll.left));
    const right = Math.min(margin, Math.max(0, scroll.right - horizontal.right));

    return new DOMRect(
      horizontal.left - left,
      vertical.top,
      horizontal.width + left + right,
      vertical.height
    );
  });
};

const isPointInBlockControlArea = (
  editor: Editor,
  target: BlockControlTarget,
  { x, y }: { x: number; y: number }
): boolean => {
  const rect = getBlockControlHoverRect(editor, target);

  // This shared virtual block area is the final pointer-based visibility boundary.
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};

export {
  getBlockContentRect,
  getBlockControlAnchorRect,
  getCachedElementRect,
  getEditorScrollContainer,
  isPointInBlockControlArea
};
export type { BlockControlTarget };
