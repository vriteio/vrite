import { type Ref } from "@andesine/components";
import { type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { createSignal, createEffect, onCleanup, Show, type ParentComponent } from "solid-js";
import { Portal } from "solid-js/web";
import { isBlockSelection } from "#editor/extensions/block-selection";
import { createVerticalAutoScroll } from "#editor/ui/auto-scroll";
import { forEachSelectedBlock, isEditorBlock } from "#editor/ui/block-utils";
import { createBlockSelectionShade } from "./shade";
import {
  EMPTY_BOX_SELECTION,
  MARQUEE_ACTIVATION_THRESHOLD,
  MARQUEE_MARGIN
} from "#editor/ui/constants";

interface BlockSelectionProps {
  editor: Editor | null;
  scrollableContainerRef: Ref<HTMLElement | null>[0];
}
interface MarqueeNode {
  fragmentPos?: number;
  fragmentRoot?: boolean;
  pos: number;
  rect: DOMRect;
  size: number;
}

const BlockSelection: ParentComponent<BlockSelectionProps> = (props) => {
  const [pointerDown, setPointerDown] = createSignal(false);
  const [scrollableContainerRect, setScrollableContainerRect] = createSignal<DOMRect | null>(null);
  const [nodes, setNodes] = createSignal<MarqueeNode[]>([]);
  const [boxSelection, setBoxSelection] = createSignal(EMPTY_BOX_SELECTION);
  const updateSelection = (position: { clientX: number; clientY: number }) => {
    const editor = props.editor;
    const container = props.scrollableContainerRef();
    const containerRect = scrollableContainerRect();

    if (!editor || !pointerDown() || !container || !containerRect) return;

    const currentSelection = boxSelection();
    const localX = Math.max(
      0,
      Math.min(position.clientX - containerRect.left + container.scrollLeft, container.scrollWidth)
    );
    const localY = Math.max(
      MARQUEE_MARGIN,
      Math.min(
        position.clientY - containerRect.top + container.scrollTop,
        container.scrollHeight - MARQUEE_MARGIN
      )
    );
    const newBoxSelectionWidth = Math.abs(localX - currentSelection.x);
    const newBoxSelectionHeight = Math.abs(localY - currentSelection.y);
    const newBoxSelection = {
      ...currentSelection,
      active:
        currentSelection.active ||
        newBoxSelectionWidth > MARQUEE_ACTIVATION_THRESHOLD ||
        newBoxSelectionHeight > MARQUEE_ACTIVATION_THRESHOLD,
      currentX: localX,
      currentY: localY,
      width: newBoxSelectionWidth,
      height: newBoxSelectionHeight
    };

    setBoxSelection(newBoxSelection);

    if (!newBoxSelection.active) return;

    const selectionLeft = Math.min(newBoxSelection.x, newBoxSelection.currentX);
    const selectionRight = Math.max(newBoxSelection.x, newBoxSelection.currentX);
    const selectionTop = Math.min(newBoxSelection.y, newBoxSelection.currentY);
    const selectionBottom = Math.max(newBoxSelection.y, newBoxSelection.currentY);
    const marqueeNodes = nodes();
    const intersects = ({ rect }: MarqueeNode): boolean => {
      return (
        rect.left < selectionRight &&
        rect.top < selectionBottom &&
        rect.right > selectionLeft &&
        rect.bottom > selectionTop
      );
    };
    const fullySelectedFragments = new Set(
      marqueeNodes
        .filter((node) => {
          return (
            node.fragmentRoot &&
            selectionTop <= node.rect.top &&
            selectionBottom >= node.rect.bottom
          );
        })
        .map((node) => node.pos)
    );
    const selectedNodes = marqueeNodes.filter((node) => {
      if (node.fragmentRoot) return fullySelectedFragments.has(node.pos);
      if (node.fragmentPos !== undefined && fullySelectedFragments.has(node.fragmentPos)) {
        return false;
      }

      return intersects(node);
    });
    const commandChain = editor.chain();

    if (selectedNodes.length) {
      const firstNode = selectedNodes[0];
      const lastNode = selectedNodes[selectedNodes.length - 1];
      const from = firstNode.pos;
      const to = lastNode.pos + lastNode.size;

      commandChain.setBlockSelection({ from, to });
    } else {
      const { inside = 0 } =
        editor.view.posAtCoords({
          left: newBoxSelection.x,
          top: newBoxSelection.y
        }) || {};

      commandChain.setTextSelection(inside || 0);
    }

    commandChain.run();
  };
  const autoScroll = createVerticalAutoScroll(
    () => props.scrollableContainerRef(),
    (position, offset) => {
      updateSelection({ ...position, clientY: position.clientY + offset });
    }
  );
  const onPointerDown = (event: PointerEvent) => {
    // Disable marquee block selection for touch devices
    if (event.pointerType === "touch") return;
    if (event.target instanceof HTMLElement && event.target.closest("[data-menu]")) return;
    if (event.target instanceof HTMLElement && event.target.closest("[data-drag-handle]")) return;

    const editor = props.editor;

    if (!editor) return;

    const container = props.scrollableContainerRef();
    const pos = editor.view.posAtCoords({
      left: event.clientX,
      top: event.clientY
    });

    if (pos || !container || event.button !== 0) return;

    const containerRect = container.getBoundingClientRect();
    const localX = Math.max(
      MARQUEE_MARGIN,
      Math.min(
        event.clientX - containerRect.left + container.scrollLeft,
        container.scrollWidth - MARQUEE_MARGIN
      )
    );
    const localY = Math.max(
      MARQUEE_MARGIN,
      Math.min(
        event.clientY - containerRect.top + container.scrollTop,
        container.scrollHeight - MARQUEE_MARGIN
      )
    );
    const boundingBoxes: MarqueeNode[] = [];

    document.documentElement.classList.add("select-none", "cursor-crosshair");
    setScrollableContainerRect(containerRect);
    setPointerDown(true);
    setBoxSelection({
      active: false,
      x: localX,
      y: localY,
      currentX: localX,
      currentY: localY,
      width: 0,
      height: 0
    });
    const addNode = (
      node: ProseMirrorNode,
      pos: number,
      options: Pick<MarqueeNode, "fragmentPos" | "fragmentRoot"> = {}
    ) => {
      const dom = editor.view.nodeDOM(pos);

      if (dom instanceof HTMLElement) {
        const rect = dom.getBoundingClientRect();
        const fragmentBoundary = options.fragmentRoot
          ? dom.nextElementSibling?.closest<HTMLElement>("[data-fragment-end-boundary]")
          : null;
        const fragmentBoundaryRect = fragmentBoundary?.getBoundingClientRect();
        const localRect: DOMRect = new DOMRect(
          rect.x - containerRect.x + container.scrollLeft,
          rect.y - containerRect.y + container.scrollTop,
          rect.width,
          Math.max(rect.bottom, fragmentBoundaryRect?.bottom || rect.bottom) - rect.top
        );

        boundingBoxes.push({
          ...options,
          size: node.nodeSize,
          rect: localRect,
          pos
        });
      }
    };

    editor.state.doc.forEach((node, pos) => {
      if (node.type.name !== "title" && !isEditorBlock(node)) return;

      addNode(node, pos, { fragmentRoot: node.type.name === "fragment" });

      if (node.type.name === "fragment") {
        node.forEach((child, offset) => {
          if (isEditorBlock(child)) addNode(child, pos + 1 + offset, { fragmentPos: pos });
        });
      }
    });
    setNodes(boundingBoxes);
    editor.chain().setTextSelection(0).run();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointerDown()) return;

    autoScroll.update(event);
    updateSelection(event);
  };
  const onPointerEnd = () => {
    const editor = props.editor;

    setPointerDown(false);
    autoScroll.stop();
    document.documentElement.classList.remove("select-none", "cursor-crosshair");

    if (boxSelection().active && editor) {
      setBoxSelection(EMPTY_BOX_SELECTION);
      editor.chain().focus(undefined, { scrollIntoView: false }).run();
    }
  };

  createEffect(() => {
    const editor = props.editor;
    const container = props.scrollableContainerRef();

    if (!editor || !container) return;

    let frame: number | null = null;

    const shade = createBlockSelectionShade(container, "block-selection-shade");

    const update = () => {
      frame = null;
      const { doc, selection } = editor.state;

      if (!isBlockSelection(selection)) {
        shade.hide();
        return;
      }

      const selectedBlocks: { first: HTMLElement | null; last: HTMLElement | null } = {
        first: null,
        last: null
      };

      forEachSelectedBlock(doc, selection.from, selection.to, (_node, pos) => {
        const dom = editor.view.nodeDOM(pos);

        if (dom instanceof HTMLElement) {
          selectedBlocks.first ||= dom;
          selectedBlocks.last = dom;
        }
      });

      const { first, last } = selectedBlocks;

      if (!first || !last) {
        shade.hide();
        return;
      }

      shade.show(editor.view.dom, first, last);
    };
    const scheduleUpdate = () => {
      if (frame !== null) return;

      frame = requestAnimationFrame(update);
    };
    const refreshShade = () => shade.refresh();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(refreshShade);

    observer?.observe(editor.view.dom);
    observer?.observe(container);
    window.addEventListener("resize", refreshShade);
    editor.on("transaction", scheduleUpdate);
    scheduleUpdate();

    onCleanup(() => {
      if (frame !== null) cancelAnimationFrame(frame);
      shade.remove();
      observer?.disconnect();
      window.removeEventListener("resize", refreshShade);
      editor.off("transaction", scheduleUpdate);
    });
  });

  createEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointerleave", onPointerEnd);
    window.addEventListener("contextmenu", onPointerEnd);

    onCleanup(() => {
      setPointerDown(false);
      autoScroll.stop();
      document.documentElement.classList.remove("select-none", "cursor-crosshair");
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointerleave", onPointerEnd);
      window.removeEventListener("contextmenu", onPointerEnd);
    });
  });

  return (
    <div class={"contents"} onPointerDown={onPointerDown}>
      {props.children}
      <Show when={boxSelection().active && props.scrollableContainerRef()}>
        <Portal mount={props.scrollableContainerRef()!}>
          <div
            class="absolute bg-gradient-to-tr opacity-10 rounded-lg z-10"
            style={{
              top: `${Math.min(boxSelection().y, boxSelection().currentY)}px`,
              left: `${Math.min(boxSelection().x, boxSelection().currentX)}px`,
              width: `${boxSelection().width}px`,
              height: `${boxSelection().height}px`
            }}
          />
        </Portal>
      </Show>
    </div>
  );
};

export { BlockSelection, createBlockSelectionShade };
