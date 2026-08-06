import { type Ref } from "@andesine/components";
import { type Editor } from "@tiptap/core";
import { createSignal, createEffect, onCleanup, Show, type ParentComponent } from "solid-js";
import { Portal } from "solid-js/web";
import { isBlockSelection } from "#editor/extensions/block-selection";
import { createVerticalAutoScroll } from "#editor/ui/auto-scroll";
import { createBlockSelectionShade } from "./shade";

interface BlockSelectionProps {
  editor: Editor | null;
  scrollableContainerRef: Ref<HTMLElement | null>[0];
}
const BlockSelection: ParentComponent<BlockSelectionProps> = (props) => {
  const [pointerDown, setPointerDown] = createSignal(false);
  const [scrollableContainerRect, setScrollableContainerRect] = createSignal<DOMRect | null>(null);
  const [nodes, setNodes] = createSignal<
    Record<string, { rect: DOMRect; pos: number; size: number }>
  >({});
  const [boxSelection, setBoxSelection] = createSignal({
    active: false,
    x: 0,
    y: 0,
    currentX: 0,
    currentY: 0,
    width: 0,
    height: 0
  });
  const updateSelection = (position: { clientX: number; clientY: number }) => {
    const editor = props.editor;
    const container = props.scrollableContainerRef();
    const containerRect = scrollableContainerRect();

    if (!editor || !pointerDown() || !container || !containerRect) return;

    const marginY = 16;
    const localX = Math.max(
      0,
      Math.min(position.clientX - containerRect.left + container.scrollLeft, container.scrollWidth)
    );
    const localY = Math.max(
      marginY,
      Math.min(
        position.clientY - containerRect.top + container.scrollTop,
        container.scrollHeight - marginY
      )
    );
    const newBoxSelectionWidth = Math.abs(localX - boxSelection().x);
    const newBoxSelectionHeight = Math.abs(localY - boxSelection().y);
    const activationThreshold = 10;
    const newBoxSelection = {
      ...boxSelection(),
      active:
        boxSelection().active ||
        newBoxSelectionWidth > activationThreshold ||
        newBoxSelectionHeight > activationThreshold,
      currentX: localX,
      currentY: localY,
      width: newBoxSelectionWidth,
      height: newBoxSelectionHeight
    };

    setBoxSelection(newBoxSelection);

    if (!newBoxSelection.active) return;

    const selectedIDs: string[] = [];
    const commandChain = editor.chain();

    Object.entries(nodes()).forEach(([id, { rect }]) => {
      if (!rect) return;

      if (
        rect.x < Math.max(newBoxSelection.x, newBoxSelection.currentX ?? newBoxSelection.x) &&
        rect.y < Math.max(newBoxSelection.y, newBoxSelection.currentY ?? newBoxSelection.y) &&
        rect.x + rect.width >
          Math.min(newBoxSelection.x, newBoxSelection.currentX ?? newBoxSelection.x) &&
        rect.y + rect.height >
          Math.min(newBoxSelection.y, newBoxSelection.currentY ?? newBoxSelection.y)
      ) {
        selectedIDs.push(id);
      }
    });

    if (selectedIDs.length) {
      const firstNode = nodes()[selectedIDs[0]];
      const lastNode = nodes()[selectedIDs[selectedIDs.length - 1]];
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
    const editor = props.editor;

    if (event.target instanceof HTMLElement && event.target.closest("[data-menu]")) return;
    if (event.target instanceof HTMLElement && event.target.closest("[data-drag-handle]")) return;

    if (!editor) return;

    const container = props.scrollableContainerRef();
    const pos = editor.view.posAtCoords({
      left: event.clientX,
      top: event.clientY
    });

    if (pos || !container || event.button !== 0) return;

    const containerRect = container.getBoundingClientRect();
    const margin = 16;
    const localX = Math.max(
      margin,
      Math.min(
        event.clientX - containerRect.left + container.scrollLeft,
        container.scrollWidth - margin
      )
    );
    const localY = Math.max(
      margin,
      Math.min(
        event.clientY - containerRect.top + container.scrollTop,
        container.scrollHeight - margin
      )
    );
    const boundingBoxes: Record<
      string,
      {
        rect: DOMRect;
        pos: number;
        size: number;
      }
    > = {};

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
    editor.state.doc.descendants((node, pos) => {
      const dom = editor.view.nodeDOM(pos);

      if (dom instanceof HTMLElement) {
        const rect = dom.getBoundingClientRect();
        const localRect: DOMRect = new DOMRect(
          rect.x - containerRect.x + container.scrollLeft,
          rect.y - containerRect.y + container.scrollTop,
          rect.width,
          rect.height
        );

        boundingBoxes[node.attrs.id] = {
          size: node.nodeSize,
          rect: localRect,
          pos
        };
      }
      return false;
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
      setBoxSelection({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        currentX: 0,
        currentY: 0
      });
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

      doc.nodesBetween(selection.from, selection.to, (node, pos, parent) => {
        if (parent !== doc) return false;
        if (node.type.name !== "title" && !node.type.isInGroup("block")) return true;

        const dom = editor.view.nodeDOM(pos);

        if (dom instanceof HTMLElement) {
          selectedBlocks.first ||= dom;
          selectedBlocks.last = dom;
        }

        return false;
      });

      const { first, last } = selectedBlocks;

      if (!first || !last) {
        shade.hide();
        return;
      }

      shade.show(editor.view.dom, first, last);
    };
    const scheduleUpdate = () => {
      if (frame !== null) cancelAnimationFrame(frame);
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
              top: `${Math.min(boxSelection().y, boxSelection().currentY ?? boxSelection().y)}px`,
              left: `${Math.min(boxSelection().x, boxSelection().currentX ?? boxSelection().x)}px`,
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
