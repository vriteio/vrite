import clsx from "clsx";
import {
  type Component,
  mergeProps,
  createSignal,
  onMount,
  onCleanup,
  createEffect
} from "solid-js";

interface VerticalResizeHandleProps {
  maxWidth?: number;
  minWidth?: number;
  collapseThreshold?: number;
  side?: "left" | "right";
  width: number;
  resize(width: number): void;
}

const VerticalResizeHandle: Component<VerticalResizeHandleProps> = (providedProps) => {
  const props = mergeProps(
    { minWidth: 248, maxWidth: 640, collapseThreshold: 50, side: "left" },
    providedProps
  );
  const [active, setActive] = createSignal(false);
  const [initialWidth, setInitialWidth] = createSignal(0);
  const [initialX, setInitialX] = createSignal(0);
  const onPointerMove = (event: MouseEvent): void => {
    if (!active()) return;

    let newWidth = initialWidth();

    if (props.side === "left") {
      newWidth = newWidth - initialX() + event.x;
    } else {
      newWidth = newWidth + initialX() - event.x;
    }

    if (newWidth > props.minWidth) {
      props.resize(Math.min(props.maxWidth, newWidth));
    } else if (initialWidth() < props.minWidth && newWidth >= props.collapseThreshold) {
      props.resize(props.minWidth);
    } else if (newWidth < props.minWidth - props.collapseThreshold) {
      props.resize(0);
    } else {
      props.resize(props.minWidth);
    }

    event.preventDefault();
    event.stopPropagation();
  };
  const onPointerEnd = (): void => {
    setActive(false);
  };

  onMount(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointerleave", onPointerEnd);
    onCleanup(() => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointerleave", onPointerEnd);
    });
  });
  createEffect(() => {
    if (active()) {
      document.body.style.userSelect = "none";
    } else {
      document.body.style.userSelect = "";
    }

    onCleanup(() => {
      document.body.style.userSelect = "";
    });
  });

  return (
    <div
      class="relative z-10"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        setActive(true);
        setInitialWidth(props.width);
        setInitialX(event.x);
      }}
    >
      <div
        class={clsx(
          "absolute w-6 h-[calc(100%-2rem)] px-2 top-4 group flex justify-center items-center cursor-col-resize",
          props.side === "left" ? "-left-[11.5px]" : "-right-[11.5px]"
        )}
      >
        <div
          class={clsx(
            "h-full w-1 group-hover:bg-gradient-to-tr absolute rounded-full hover:bg-gradient-to-tr",
            active() && "bg-gradient-to-tr"
          )}
        />
      </div>
    </div>
  );
};

export { VerticalResizeHandle };
