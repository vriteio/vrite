import { type Accessor, createEffect, createSignal, type JSX } from "solid-js";
import { createRef } from "../../ref";

interface MobileDropdownDragOptions {
  expanded: Accessor<boolean>;
  opened: Accessor<boolean>;
  close(): void;
  setExpanded(expanded: boolean): void;
}

const DRAG_ACTIVATION_DISTANCE = 8;
const SNAP_DISTANCE = 64;
const MIN_SHEET_HEIGHT = 72;
const SCROLLABLE_OVERFLOW_VALUES = new Set(["auto", "scroll"]);

const useMobileDropdownDrag = (options: MobileDropdownDragOptions) => {
  const [height, setHeight] = createSignal<number | null>(null);
  const [dragging, setDragging] = createSignal(false);
  const [dragOrigin, setDragOrigin] = createRef({ y: 0, height: 0 });
  const [gesturePending, setGesturePending] = createRef(false);
  const [scrollableElement, setScrollableElement] = createRef<HTMLElement | null>(null);
  const [clickSuppressed, setClickSuppressed] = createRef(false);
  const [closingFromGesture, setClosingFromGesture] = createRef(false);
  const [heightCleanupPending, setHeightCleanupPending] = createRef(false);
  const [heightCleanupInterrupted, setHeightCleanupInterrupted] = createRef(false);
  const viewportHeight = () => window.visualViewport?.height || window.innerHeight;
  const dragDistance = (clientY: number) => dragOrigin().y - clientY;
  const cancelHeightCleanup = () => {
    setHeightCleanupPending(false);
  };
  const resetGesture = () => {
    cancelHeightCleanup();
    setHeightCleanupInterrupted(false);
    setGesturePending(false);
    setScrollableElement(null);
    setClickSuppressed(false);
    setClosingFromGesture(false);
    setDragging(false);
    setHeight(null);
  };
  const startGesture = (clientY: number, sheet: HTMLElement) => {
    setHeightCleanupInterrupted(heightCleanupPending());
    cancelHeightCleanup();
    setGesturePending(true);
    setDragOrigin({ y: clientY, height: sheet.getBoundingClientRect().height });
  };
  const updateGesture = (clientY: number, onActivate?: () => void) => {
    const distance = dragDistance(clientY);
    const passedActivationDistance = Math.abs(distance) >= DRAG_ACTIVATION_DISTANCE;

    if (!gesturePending()) return false;

    if (!dragging()) {
      if (!passedActivationDistance) return false;

      setHeightCleanupInterrupted(false);
      setDragging(true);
      setHeight(dragOrigin().height);
      onActivate?.();
    }

    setHeight(
      Math.min(viewportHeight(), Math.max(MIN_SHEET_HEIGHT, dragOrigin().height + distance))
    );

    return true;
  };
  const suppressNextClick = () => {
    setClickSuppressed(true);
    window.setTimeout(() => {
      setClickSuppressed(false);
    });
  };
  const finishGesture = (clientY: number) => {
    const distance = dragDistance(clientY);
    const restingHeight = dragOrigin().height;
    const shouldExpand = distance >= SNAP_DISTANCE;
    const shouldClose = distance <= -SNAP_DISTANCE;
    const shouldAnimateToRestingHeight = height() !== restingHeight;

    if (!gesturePending()) return;

    setGesturePending(false);

    if (!dragging()) {
      if (heightCleanupInterrupted()) setHeight(null);
      setHeightCleanupInterrupted(false);

      return;
    }

    setHeightCleanupInterrupted(false);
    if (shouldClose) setClosingFromGesture(true);
    setDragging(false);
    suppressNextClick();

    if (shouldExpand) {
      options.setExpanded(true);
      setHeight(viewportHeight());
    } else if (shouldClose) {
      options.close();
    } else if (shouldAnimateToRestingHeight) {
      setHeightCleanupPending(true);
      setHeight(restingHeight);
    } else {
      setHeight(null);
    }
  };
  const findScrollableElement = (target: EventTarget | null) => {
    let element = target instanceof Element ? target : null;

    while (element) {
      if (element instanceof HTMLElement) {
        const overflowY = window.getComputedStyle(element).overflowY;
        const isScrollable =
          SCROLLABLE_OVERFLOW_VALUES.has(overflowY) && element.scrollHeight > element.clientHeight;

        if (isScrollable) return element;
      }

      if (element.hasAttribute("data-dropdown-mobile-sheet")) return null;
      element = element.parentElement;
    }

    return null;
  };
  const canContinueScrolling = (movement: number) => {
    const element = scrollableElement();
    const canScrollUp = Boolean(element && movement > 0 && element.scrollTop > 0);
    const canScrollDown = Boolean(
      element && movement < 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1
    );

    return canScrollUp || canScrollDown;
  };
  const findSheet = (element: HTMLElement) =>
    element.closest<HTMLElement>("[data-dropdown-mobile-sheet]");
  const suppressDraggedClick = (event: MouseEvent) => {
    if (!clickSuppressed()) return;

    setClickSuppressed(false);
    event.preventDefault();
    event.stopPropagation();
  };
  const onHeightTransitionEnd: JSX.EventHandler<HTMLElement, TransitionEvent> = (event) => {
    const isHeightTransition =
      event.target === event.currentTarget && event.propertyName === "height";

    if (!heightCleanupPending() || !isHeightTransition) return;

    setHeightCleanupPending(false);
    setHeight(null);
  };

  // Mouse and pen gestures can use pointer capture without affecting native touch scrolling.
  const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const isMouseOrPenPrimaryButton = event.pointerType !== "touch" && event.button === 0;
    const sheet = findSheet(event.currentTarget);

    if (!isMouseOrPenPrimaryButton) return;
    if (!sheet) return;

    startGesture(event.clientY, sheet);
  };
  const onPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const capturePointer = () => {
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    if (event.pointerType === "touch") return;

    if (updateGesture(event.clientY, capturePointer)) {
      event.preventDefault();
    }
  };
  const onPointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerType === "touch") return;

    finishGesture(event.clientY);
  };
  const onPointerCancel: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (event.pointerType !== "touch") resetGesture();
  };

  // The backdrop disables native touch actions, so pointer events handle every input type here.
  const onBackdropPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const isPrimaryButton = event.isPrimary && event.button === 0;
    const sheet = event.currentTarget.parentElement?.querySelector<HTMLElement>(
      "[data-dropdown-mobile-sheet]"
    );

    if (!isPrimaryButton) return;
    if (!sheet) return;

    startGesture(event.clientY, sheet);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onBackdropPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    if (!event.isPrimary) return;

    if (updateGesture(event.clientY)) {
      event.preventDefault();
    }
  };
  const onBackdropPointerUp: JSX.EventHandler<HTMLDivElement, PointerEvent> = (event) => {
    const hasPointerCapture = event.currentTarget.hasPointerCapture(event.pointerId);

    if (!event.isPrimary) return;

    if (hasPointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    finishGesture(event.clientY);
  };

  // Touch events let scrollable sheet content retain native scrolling until it reaches an edge.
  const onTouchStart: JSX.EventHandler<HTMLDivElement, TouchEvent> = (event) => {
    const hasSingleTouch = event.touches.length === 1;
    const sheet = findSheet(event.currentTarget);

    if (!hasSingleTouch) return;
    if (!sheet) return;

    setScrollableElement(findScrollableElement(event.target));
    startGesture(event.touches[0].clientY, sheet);
  };
  const onTouchMove: JSX.EventHandler<HTMLDivElement, TouchEvent> = (event) => {
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    const clientY = touch?.clientY ?? dragOrigin().y;
    const movement = clientY - dragOrigin().y;
    const canTrackTouchGesture = gesturePending() && Boolean(touch);
    const shouldContinueScrolling =
      canTrackTouchGesture &&
      !dragging() &&
      Math.abs(movement) >= DRAG_ACTIVATION_DISTANCE &&
      canContinueScrolling(movement);

    if (!canTrackTouchGesture) return;

    if (shouldContinueScrolling) {
      setGesturePending(false);
      if (heightCleanupInterrupted()) setHeight(null);
      setHeightCleanupInterrupted(false);

      return;
    }

    if (updateGesture(clientY)) {
      event.preventDefault();
    }
  };
  const onTouchEnd: JSX.EventHandler<HTMLDivElement, TouchEvent> = (event) => {
    setScrollableElement(null);
    finishGesture(event.changedTouches[0]?.clientY ?? dragOrigin().y);
  };

  const clickSuppressionProps = { "oncapture:click": suppressDraggedClick };
  const gestureProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    "on:touchstart": onTouchStart,
    "on:touchmove": { handleEvent: onTouchMove, passive: false },
    "on:touchend": onTouchEnd,
    "on:touchcancel": resetGesture,
    ...clickSuppressionProps
  };
  const backdropGestureProps = {
    onPointerDown: onBackdropPointerDown,
    onPointerMove: onBackdropPointerMove,
    onPointerUp: onBackdropPointerUp,
    onPointerCancel: resetGesture,
    ...clickSuppressionProps
  };

  createEffect(() => {
    const expanded = options.expanded();

    if (!options.opened()) {
      resetGesture();
    } else if (closingFromGesture()) {
      return;
    } else if (expanded && !dragging()) {
      setHeight(viewportHeight());
    } else if (!dragging() && !heightCleanupPending()) {
      setHeight(null);
    }
  });

  return {
    height,
    dragging,
    onHeightTransitionEnd,
    gestureProps,
    backdropGestureProps
  };
};

export { useMobileDropdownDrag };
