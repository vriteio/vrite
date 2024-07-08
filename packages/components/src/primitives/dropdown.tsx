import { Overlay } from "./overlay";
import { Card } from "./card";
import { createRef } from "../ref";
import { isTouchDevice } from "../utils";
import clsx from "clsx";
import {
  Component,
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { computePosition, flip, Placement, size } from "@floating-ui/dom";
import { Dynamic, Portal } from "solid-js/web";
import { createMediaQuery } from "@solid-primitives/media";
import { createActiveElement } from "@solid-primitives/active-element";

interface DropdownProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  cardProps?: Partial<ComponentProps<typeof Card>>;
  overlayProps?: Partial<ComponentProps<typeof Overlay>>;
  placement?: Placement;
  fixed?: boolean;
  children: JSX.Element;
  opened?: boolean;
  autoFocus?: boolean;
  overlay?: boolean;
  attachActivatorHandler?: boolean;
  activatorWrapperClass?: string;
  overflowContainerClass?: string;
  alternativePlacements?: Placement[];
  boundary?: HTMLElement | null;
  activatorButton: Component<{ opened: boolean; computeDropdownPosition(): void }>;
  setOpened?(opened: boolean): void;
}

const placementToTransformOrigin = (placement: Placement): string => {
  switch (placement) {
    case "bottom-start":
      return "top left";
    case "bottom-end":
      return "top right";
    case "top-start":
      return "bottom left";
    case "top-end":
      return "bottom right";
    case "right-start":
      return "top left";
    case "right-end":
      return "bottom left";
    case "left-start":
      return "top right";
    case "left-end":
      return "bottom right";
    default:
      return "top left";
  }
};
const Dropdown: Component<DropdownProps> = (props) => {
  const md = createMediaQuery("(min-width: 768px)");
  const activeElement = createActiveElement();
  const [buttonRef, setButtonRef] = createRef<HTMLElement | null>(null);
  const [boxRef, setBoxRef] = createRef<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(props.opened || false);
  const [resizing, setResizing] = createSignal(false);
  const [height, setHeight] = createSignal(0);
  const [minHeight, setMinHeight] = createSignal(0);
  const [placement, setPlacement] = createSignal<Placement>("bottom-start");
  const cardStyle = createMemo((): JSX.CSSProperties => {
    if (md()) {
      return {
        "transition-property": "transform, box-shadow, visibility, opacity",
        "transform-origin": placementToTransformOrigin(placement()),
        "height": height() ? `${height()}px` : undefined
      };
    }

    return {
      "transition-property": "transform, box-shadow, visibility, opacity",
      "box-shadow": "0 -25px 50px -12px rgba(0, 0, 0, 0.25)",
      "height": height() ? `${height()}px` : undefined
    };
  });
  const computeDropdownPosition = (): void => {
    const button = buttonRef();
    const box = boxRef();

    if (button && box) {
      computePosition(button, box, {
        middleware: [
          flip({
            fallbackPlacements: props.alternativePlacements,
            ...(props.boundary && { boundary: props.boundary })
          }),
          size({
            padding: 16,
            apply({ availableWidth, availableHeight, elements }) {
              Object.assign(elements.floating.style, {
                maxWidth: `${availableWidth}px`,
                maxHeight: `${availableHeight}px`
              });
            }
          })
        ],
        placement: props.placement || "bottom-start",
        strategy: props.fixed ? "fixed" : "absolute"
      }).then(({ x, y, placement }) => {
        box.style.top = `${y}px`;
        box.style.left = `${x}px`;
        setPlacement(placement);
      });
    }
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (!isTouchDevice()) return;

    setResizing(true);
    setHeight(boxRef()?.getBoundingClientRect().height || 0);
    setMinHeight((minHeight) => minHeight || boxRef()?.getBoundingClientRect().height || 0);

    const prevY = event.pageY;
    const prevHeight = height();

    let delta = 0;

    const onMove = (event: PointerEvent): void => {
      delta = (prevY || 0) - event.pageY;
      setHeight(() => prevHeight + delta);
      event.preventDefault();
      event.stopPropagation();
    };
    const up = (): void => {
      document.body.removeEventListener("pointermove", onMove);
      document.body.removeEventListener("pointerup", up);
      setMinHeight(0);

      if (delta > 25) {
        setHeight(document.getElementById("dropdowns")?.getBoundingClientRect().height || 0);
      } else if (delta < -25) {
        setOpened(false);
      }
    };

    document.body.addEventListener("pointermove", onMove);
    document.body.addEventListener("pointerup", up);
  };

  onMount(() => {
    computeDropdownPosition();
    new ResizeObserver(() => {
      computeDropdownPosition();
    }).observe(boxRef()!);
  });
  createEffect(() => {
    setOpened(props.opened || false);
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });
  createEffect(
    on(opened, (opened) => {
      if (opened) {
        document.documentElement.classList.add("dropdown-opened");
      } else {
        document.documentElement.classList.remove("dropdown-opened");
        setTimeout(() => {
          setHeight(0);
        }, 300);
      }

      if (opened && props.autoFocus !== false) {
        computeDropdownPosition();
        boxRef()?.focus();
      }
    })
  );
  createEffect(() => {
    if (!md() && boxRef()?.contains(activeElement()) && activeElement()?.tagName === "INPUT") {
      setHeight(document.getElementById("dropdowns")?.getBoundingClientRect().height || 0);
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  });
  createEffect(
    on([() => props.overlay, opened], ([overlay, opened]) => {
      const handleClick = (event: MouseEvent): void => {
        if (
          !boxRef()?.contains(event.target as Node) &&
          !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")
        ) {
          setOpened(false);
          event.preventDefault();
          event.stopPropagation();
        }
      };

      if (overlay === false && opened) {
        document.body.addEventListener("click", handleClick);
      }

      onCleanup(() => {
        document.body.removeEventListener("click", handleClick);
      });
    })
  );

  return (
    <div
      class={clsx(":base: relative flex items-center focus:outline-none", props.class)}
      tabindex="0"
    >
      <Show when={props.overlay !== false}>
        <Overlay
          shadeClass="bg-transparent"
          portal={!md()}
          class={clsx(!opened() && "pointer-events-none h-0 w-0")}
          opened={opened()}
          onOverlayClick={() => {
            setOpened(false);
          }}
          onPointerDown={onPointerDown}
          {...props.overlayProps}
        />
      </Show>
      <div
        ref={setButtonRef}
        onClick={(event) => {
          if (props.attachActivatorHandler !== false) {
            event.stopPropagation();
            event.preventDefault();
            setOpened(!opened());
          }
        }}
        class={clsx("flex", props.activatorWrapperClass)}
      >
        <Dynamic
          component={props.activatorButton}
          computeDropdownPosition={computeDropdownPosition}
          opened={opened()}
        />
      </div>
      <Dynamic
        component={md() ? "div" : Portal}
        mount={(!md() && document.getElementById("dropdowns")) || undefined}
      >
        <Card
          {...(props.cardProps || {})}
          class={clsx(
            `:base-2: z-50 flex flex-col p-2 overflow-hidden transform shadow-2xl duration-250 min-w-fit`,
            !md() &&
              "fixed !left-0 w-full !max-w-full !max-h-full m-0 p-0 pb-1 border-0 border-t-2 shadow-none rounded-none !top-unset bottom-0 h-unset",
            props.fixed ? "fixed" : "absolute",
            opened() ? "" : "translate-y-full md:translate-y-0 md:scale-0 !shadow-none",
            opened() ? `:base-2: visible md:opacity-100` : `:base-2: invisible md:opacity-0`,
            props.cardProps?.class
          )}
          style={cardStyle()}
          ref={setBoxRef}
        >
          <div
            class="md:hidden flex justify-center items-center h-8 min-h-8"
            onPointerDown={onPointerDown}
          >
            <div class="h-1.5 w-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          </div>
          <div
            class={clsx(
              "overflow-auto scrollbar-sm flex-1 min-w-fit",
              props.overflowContainerClass
            )}
            style={{ "min-height": `${minHeight()}px` }}
          >
            {props.children}
          </div>
        </Card>
      </Dynamic>
    </div>
  );
};

export { Dropdown };
