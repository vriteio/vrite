import { useTree } from "#web/components/tree";
import { createRef } from "@andesine/components";
import { createSignal, onCleanup, onMount } from "solid-js";

type BoxSelection = {
  active: boolean;
  x: number;
  y: number;
  currentX: number;
  currentY: number;
  width: number;
  height: number;
};

const emptyBox = (): BoxSelection => ({
  active: false,
  x: 0,
  y: 0,
  currentX: 0,
  currentY: 0,
  width: 0,
  height: 0
});

const useExplorerMarquee = (container: () => HTMLElement | null) => {
  const [{ selection, flattenedLayout }, { setExactSelection }] = useTree();
  const [pointerDown, setPointerDown] = createSignal(false);
  const [boxSelection, setBoxSelection] = createSignal(emptyBox());
  const [initialSelection, setInitialSelection] = createRef<string[]>([]);
  const [mode, setMode] = createRef<"replace" | "add" | "remove">("replace");
  const [scrollFrame, setScrollFrame] = createRef(0);
  const stopAutoScroll = () => {
    window.cancelAnimationFrame(scrollFrame());
    setScrollFrame(0);
  };
  const applySelection = (box = boxSelection()) => {
    const element = container();
    if (!element || !box.active) return;

    const rect = element.getBoundingClientRect();
    const left = Math.min(box.x, box.currentX);
    const right = Math.max(box.x, box.currentX);
    const top = Math.min(box.y, box.currentY);
    const bottom = Math.max(box.y, box.currentY);
    const selected = flattenedLayout().flatMap((item) => {
      const itemTop = rect.top + item.top - element.scrollTop;
      const intersects =
        rect.left < right && itemTop < bottom && rect.right > left && itemTop + item.height > top;

      return intersects ? [item.id] : [];
    });

    if (mode() === "add") {
      setExactSelection(Array.from(new Set([...initialSelection(), ...selected])));
    } else if (mode() === "remove") {
      const selectedSet = new Set(selected);
      setExactSelection(initialSelection().filter((id) => !selectedSet.has(id)));
    } else {
      setExactSelection(selected);
    }
  };
  const startAutoScroll = () => {
    stopAutoScroll();
    const scroll = () => {
      const element = container();
      const box = boxSelection();
      if (!element || !pointerDown() || !box.active) return stopAutoScroll();

      const rect = element.getBoundingClientRect();
      const threshold = 36;
      const speed =
        box.currentY < rect.top + threshold
          ? Math.max(-12, (box.currentY - rect.top - threshold) / 3)
          : box.currentY > rect.bottom - threshold
            ? Math.min(12, (box.currentY - rect.bottom + threshold) / 3)
            : 0;
      const previous = element.scrollTop;
      element.scrollTop += speed;
      if (element.scrollTop !== previous) applySelection(box);
      setScrollFrame(window.requestAnimationFrame(scroll));
    };

    setScrollFrame(window.requestAnimationFrame(scroll));
  };
  const onPointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof HTMLElement) || event.button !== 0) return;
    if (
      !event.target.closest("[data-explorer-panel]") ||
      event.target.matches("[data-entry] *, [data-collection] *")
    )
      return;

    document.documentElement.style.userSelect = "none";
    setInitialSelection(selection());
    setMode(
      event.altKey ? "remove" : event.metaKey || event.ctrlKey || event.shiftKey ? "add" : "replace"
    );
    setPointerDown(true);
    setBoxSelection({
      ...emptyBox(),
      x: event.clientX,
      y: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY
    });
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointerDown()) return;

    const previous = boxSelection();
    const width = Math.abs(event.clientX - previous.x);
    const height = Math.abs(event.clientY - previous.y);
    const next = {
      ...previous,
      active: previous.active || width > 10 || height > 10,
      currentX: event.clientX,
      currentY: event.clientY,
      width,
      height
    };

    setBoxSelection(next);
    if (!next.active) return;
    applySelection(next);
    if (!previous.active) startAutoScroll();
  };
  const onPointerEnd = () => {
    setPointerDown(false);
    stopAutoScroll();
    document.documentElement.style.userSelect = "";
    setBoxSelection(emptyBox());
  };

  onMount(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    window.addEventListener("blur", onPointerEnd);
    document.body.addEventListener("pointerleave", onPointerEnd);
    document.body.addEventListener("contextmenu", onPointerEnd);
    onCleanup(() => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("blur", onPointerEnd);
      document.body.removeEventListener("pointerleave", onPointerEnd);
      document.body.removeEventListener("contextmenu", onPointerEnd);
      onPointerEnd();
    });
  });

  return { boxSelection, onPointerDown };
};

export { useExplorerMarquee };
