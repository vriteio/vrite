import { createRef } from "@andesine/components";
import { createSignal, type JSX, onCleanup } from "solid-js";

interface ExplorerItemSwipeOptions {
  enabled?(): boolean;
  onOpen(): void;
}

const MAX_SWIPE_OFFSET = 80;
const SWIPE_DIRECTION_THRESHOLD = 4;

const useExplorerItemSwipe = (options: ExplorerItemSwipeOptions) => {
  const [offset, setOffset] = createSignal(0);
  const [swiping, setSwiping] = createSignal(false);
  const [pointerID, setPointerID] = createRef<number | null>(null);
  const [startX, setStartX] = createRef(0);
  const [startY, setStartY] = createRef(0);
  const [suppressClick, setSuppressClick] = createRef(false);
  const [suppressClickTimeout, setSuppressClickTimeout] = createRef(0);
  const reset = () => {
    setPointerID(null);
    setOffset(0);
    setSwiping(false);
  };
  const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerType === "mouse" || event.button !== 0 || options.enabled?.() === false)
      return;

    clearTimeout(suppressClickTimeout());
    setPointerID(event.pointerId);
    setStartX(event.clientX);
    setStartY(event.clientY);
    setSuppressClick(false);
  };
  const onPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerId !== pointerID()) return;

    const deltaX = startX() - event.clientX;
    const deltaY = startY() - event.clientY;
    const movedFarEnough = Math.max(Math.abs(deltaX), Math.abs(deltaY)) > SWIPE_DIRECTION_THRESHOLD;

    if (!swiping() && !movedFarEnough) return;

    if (!swiping() && Math.abs(deltaY) >= Math.abs(deltaX)) {
      reset();
      return;
    }

    setSwiping(true);
    setOffset(Math.min(MAX_SWIPE_OFFSET, Math.max(0, deltaX)));
  };
  const onPointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerId !== pointerID()) return;

    const openMenu = offset() === MAX_SWIPE_OFFSET;

    setSuppressClick(swiping());
    reset();

    if (openMenu) options.onOpen();

    setSuppressClickTimeout(
      window.setTimeout(() => {
        setSuppressClick(false);
      }, 500)
    );
  };
  const onPointerCancel: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerId === pointerID()) reset();
  };
  const onClickCapture: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    if (!suppressClick()) return;

    setSuppressClick(false);
    event.preventDefault();
    event.stopPropagation();
  };

  onCleanup(() => {
    clearTimeout(suppressClickTimeout());
  });

  return {
    gestureProps: {
      onClickCapture,
      onPointerCancel,
      onPointerDown,
      onPointerMove,
      onPointerUp
    },
    offset,
    progress: () => offset() / MAX_SWIPE_OFFSET,
    swiping
  };
};

export { useExplorerItemSwipe };
