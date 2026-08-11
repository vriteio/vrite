import { type JSX, onCleanup } from "solid-js";
import { createRef } from "../../ref";

interface DropdownLongPressOptions {
  delay?: number;
  enabled(event: PointerEvent): boolean;
  onLongPress(event: PointerEvent): void;
  tolerance?: number;
}

const handledLongPressEvents = new WeakSet<Event>();

const useDropdownLongPress = (options: DropdownLongPressOptions) => {
  const delay = () => options.delay ?? 500;
  const tolerance = () => options.tolerance ?? 10;
  const [start, setStart] = createRef<{ x: number; y: number } | null>(null);
  const [timeout, setTimeoutRef] = createRef(0);
  const [triggered, setTriggered] = createRef(false);
  const [restoreSelection, setRestoreSelection] = createRef<(() => void) | null>(null);
  const releaseGesture = () => {
    if (timeout()) clearTimeout(timeout()!);

    setTimeoutRef(0);
    setStart(null);
    restoreSelection()?.();
    setRestoreSelection(null);
  };
  const cancelGesture = () => {
    releaseGesture();
    setTriggered(false);
  };
  const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerType === "mouse" || !options.enabled(event)) return;
    if (handledLongPressEvents.has(event)) return;
    handledLongPressEvents.add(event);

    cancelGesture();
    setStart({ x: event.clientX, y: event.clientY });
    setTimeoutRef(
      window.setTimeout(() => {
        setTimeoutRef(0);
        setTriggered(true);
        options.onLongPress(event);
      }, delay())
    );
  };
  const onPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const initialPoint = start();

    if (
      initialPoint &&
      Math.hypot(event.clientX - initialPoint.x, event.clientY - initialPoint.y) > tolerance()
    ) {
      cancelGesture();
    }
  };
  const onClick: JSX.EventHandler<HTMLDivElement, MouseEvent> = (event) => {
    if (!triggered()) return;

    setTriggered(false);
    event.preventDefault();
    event.stopPropagation();
  };

  onCleanup(cancelGesture);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: releaseGesture,
    onPointerCancel: cancelGesture,
    onPointerLeave: cancelGesture,
    onDragStart: cancelGesture,
    onClick
  };
};

export { useDropdownLongPress };
