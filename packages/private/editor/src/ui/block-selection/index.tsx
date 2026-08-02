import { Ref } from "@andesine/components";
import { Editor } from "@tiptap/core";
import { nanoid } from "nanoid";
import { createSignal, createEffect, onCleanup, Show, ParentComponent } from "solid-js";
import { Portal } from "solid-js/web";

interface BlockSelectionProps {
  editor: Editor | null;
  scrollableContainerRef: Ref<HTMLElement | null>[0];
}
interface AutoScrollOptions {
  direction?: "top" | "bottom";
  speed?: number;
}

const BlockSelection: ParentComponent<BlockSelectionProps> = (props) => {
  const [pointerDown, setPointerDown] = createSignal(false);
  const [autoScrollHandle, setAutoScrollHandle] = createSignal("");
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
  const scroll = (options?: AutoScrollOptions) => {
    const container = props.scrollableContainerRef();
    const containerRect = scrollableContainerRect();

    if (!container || !containerRect) return 0;

    const scrollSpeed = options?.speed || 1;
    const direction = options?.direction || "bottom";

    if (direction === "top") {
      if (container.scrollTop === 0) return 0;

      container.scrollTop = Math.max(0, container.scrollTop - scrollSpeed);

      return -scrollSpeed;
    } else if (direction === "bottom") {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight) return 0;

      container.scrollTop = Math.min(
        container.scrollHeight - container.clientHeight,
        container.scrollTop + scrollSpeed
      );

      return scrollSpeed;
    }

    return 0;
  };
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
  const startAutoScroll = (
    startPosition: { clientX: number; clientY: number },
    options?: AutoScrollOptions
  ) => {
    const handle = nanoid();
    const autoScrollFrame = () => {
      if (autoScrollHandle() !== handle) return;

      const offset = scroll(options);

      if (offset !== 0) {
        updateSelection({
          clientX: startPosition.clientX,
          clientY: startPosition.clientY + offset
        });
        requestAnimationFrame(autoScrollFrame);
      } else {
        setAutoScrollHandle("");
      }
    };

    setAutoScrollHandle(handle);
    autoScrollFrame();
  };
  const stopAutoScroll = () => {
    setAutoScrollHandle("");
  };
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
    const container = props.scrollableContainerRef();
    const containerRect = scrollableContainerRect();

    if (!pointerDown() || !container || !containerRect) return;

    const scrollThreshold = 50;
    const distanceFromTop = Math.max(0, event.clientY - containerRect.top);
    const distanceFromBottom = Math.max(0, containerRect.bottom - event.clientY);

    if (distanceFromTop < scrollThreshold) {
      const scrollSpeedMultiplier = Math.max(
        1,
        ((scrollThreshold - distanceFromTop) / scrollThreshold) * 10
      );

      startAutoScroll(event, {
        direction: "top",
        speed: 3 * scrollSpeedMultiplier
      });
    } else if (distanceFromBottom < scrollThreshold) {
      const scrollSpeedMultiplier = Math.max(
        1,
        ((scrollThreshold - distanceFromBottom) / scrollThreshold) * 10
      );

      startAutoScroll(event, { direction: "bottom", speed: 3 * scrollSpeedMultiplier });
    } else {
      stopAutoScroll();
    }

    updateSelection(event);
  };
  const onPointerEnd = () => {
    const editor = props.editor;

    setPointerDown(false);
    stopAutoScroll();
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
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointerleave", onPointerEnd);
    window.addEventListener("contextmenu", onPointerEnd);

    onCleanup(() => {
      setPointerDown(false);
      stopAutoScroll();
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

export { BlockSelection };
