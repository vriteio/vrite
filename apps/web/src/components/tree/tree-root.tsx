import { type ParentComponent, onMount, onCleanup } from "solid-js";
import { useTree } from "./tree-context";
import { createRef } from "@andesine/components";

interface TreeTouchGesture {
  pointerID: number;
  x: number;
  y: number;
}

const TOUCH_MOVEMENT_TOLERANCE = 10;

const TreeRoot: ParentComponent = (props) => {
  const [rootRef, setRootRef] = createRef<HTMLDivElement | undefined>(undefined);
  const [touchGesture, setTouchGesture] = createRef<TreeTouchGesture | null>(null);
  const [, { setSelection }] = useTree();

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      const root = rootRef();
      const interactionTarget =
        target instanceof Element ? target.closest("[data-tree-item], [role='menu']") : null;
      const isInsideRoot = Boolean(root && target instanceof Node && root.contains(target));
      const isTreeInteraction = Boolean(
        root && interactionTarget && root.contains(interactionTarget)
      );
      const isModifiedInteraction =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;

      if (isInsideRoot && !isTreeInteraction && isModifiedInteraction) {
        setTouchGesture(null);
        return;
      }

      const shouldClearSelection = !isInsideRoot || !isTreeInteraction;

      if (!shouldClearSelection) {
        setTouchGesture(null);
        return;
      }

      if (event.pointerType === "mouse") {
        setSelection([]);
        return;
      }

      setTouchGesture({
        pointerID: event.pointerId,
        x: event.clientX,
        y: event.clientY
      });
    };
    const handlePointerMove = (event: PointerEvent) => {
      const gesture = touchGesture();

      if (!gesture || gesture.pointerID !== event.pointerId) return;

      const movement = Math.max(
        Math.abs(event.clientX - gesture.x),
        Math.abs(event.clientY - gesture.y)
      );

      if (movement > TOUCH_MOVEMENT_TOLERANCE) setTouchGesture(null);
    };
    const handlePointerUp = (event: PointerEvent) => {
      const gesture = touchGesture();

      if (!gesture || gesture.pointerID !== event.pointerId) return;

      setTouchGesture(null);
      setSelection([]);
    };
    const cancelTouchGesture = () => setTouchGesture(null);

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", cancelTouchGesture, true);
    document.addEventListener("contextmenu", cancelTouchGesture, true);
    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", cancelTouchGesture, true);
      document.removeEventListener("contextmenu", cancelTouchGesture, true);
    });
  });

  return (
    <div ref={setRootRef} class="contents">
      {props.children}
    </div>
  );
};

export { TreeRoot };
