import { Card } from "./card";
import { createRef } from "../ref";
import { isTouchDevice } from "../utils";
import clsx from "clsx";
import {
  Component,
  ComponentProps,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  JSX,
  on,
  onCleanup,
  onMount,
  ParentComponent,
  Show,
  useContext
} from "solid-js";
import { computePosition, flip, offset, Placement, size } from "@floating-ui/dom";
import { Dynamic, Portal } from "solid-js/web";
import { createMediaQuery } from "@solid-primitives/media";
import { createActiveElement } from "@solid-primitives/active-element";
import { createScheduled, debounce } from "@solid-primitives/scheduled";

interface DropdownAreaProps {
  enabled?(event: PointerEvent | MouseEvent): boolean;
}
interface DropdownProps extends JSX.HTMLAttributes<HTMLDivElement> {
  class?: string;
  cardProps?: Partial<ComponentProps<typeof Card>>;
  placement?: Placement;
  fixed?: boolean;
  children: JSX.Element;
  opened?: boolean;
  autoFocus?: boolean;
  attachActivatorHandler?: boolean;
  overflowContainerClass?: string;
  cardWrapperClass?: string;
  alternativePlacements?: Placement[];
  boundary?: HTMLElement | null;
  activatorButton?: Component<{ opened: boolean; computeDropdownPosition(): void }>;
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
const DropdownAreaContext = createContext<{
  onContextMenu(callback: (event: MouseEvent) => void): void;
}>({
  onContextMenu: () => {}
});
const DropdownArea: ParentComponent<DropdownAreaProps> = (props) => {
  const [onContextMenuCallbackRef, setOnContextMenuCallbackRef] = createRef<
    (event: MouseEvent) => void
  >(() => {});
  return (
    <DropdownAreaContext.Provider
      value={{
        onContextMenu(callback) {
          setOnContextMenuCallbackRef(callback);
        }
      }}
    >
      <div
        class="contents pointer-events-auto"
        onPointerDown={(event) => {
          const isContextMenu = event.button === 2;

          if (isContextMenu && (!props.enabled || props.enabled(event))) {
            onContextMenuCallbackRef()(event);
          }
        }}
        onContextMenu={(event) => {
          if (!props.enabled || props.enabled(event)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {props.children}
      </div>
    </DropdownAreaContext.Provider>
  );
};
const Dropdown: Component<DropdownProps> = (props) => {
  const debounced = createScheduled((fn) => debounce(fn, 300));
  const md = createMediaQuery("(min-width: 768px)");
  const activeElement = createActiveElement();
  const [activatorWrapperRef, setActivatorWrapperRef] = createRef<HTMLElement | null>(null);
  const [boxRef, setBoxRef] = createSignal<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(props.opened || false);
  const [height, setHeight] = createSignal(0);
  const [minHeight, setMinHeight] = createSignal(0);
  const [forcedPlacement, setForcedPlacement] = createSignal<Placement | null>(null);
  const [forcedPosition, setForcedPosition] = createSignal<{ x: number; y: number } | null>(null);
  const [placement, setPlacement] = createSignal<Placement>("bottom-start");
  const openedWithDebouncedClose = createMemo((previousValue) => {
    const value = opened();
    const debouncedValue = debounced() ? value : previousValue;

    // Open immediately
    if (value) return value;

    return debouncedValue;
  });
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
    const activator = activatorWrapperRef()?.firstElementChild;
    const box = boxRef();

    if (box) {
      if (forcedPosition()) {
        box.style.top = `${forcedPosition()?.y}px`;
        box.style.left = `${forcedPosition()?.x}px`;
        setPlacement((placement) => forcedPlacement() || placement);

        return;
      }
      if (activator) {
        computePosition(activator, box, {
          middleware: [
            offset({ mainAxis: 8 }),
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
    }
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (!isTouchDevice()) return;

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
  const { onContextMenu } = useContext(DropdownAreaContext);

  createEffect(() => {
    if (!boxRef()) return;
    computeDropdownPosition();
    onContextMenu((event) => {
      if (document.documentElement.classList.contains("dropdown-opened")) return;
      if (boxRef()?.contains(event.target as Node)) return;

      setForcedPosition({ x: event.clientX, y: event.clientY });
      setForcedPlacement("bottom-start");
      setOpened(true);
      computeDropdownPosition();
      event.preventDefault();
      event.stopPropagation();
    });
    const resizeObserver = new ResizeObserver(() => {
      computeDropdownPosition();
    });

    resizeObserver.observe(boxRef()!);

    onCleanup(() => {
      resizeObserver.disconnect();
      if (opened()) {
        document.documentElement.classList.remove("dropdown-opened");
      }
    });
  });
  createEffect(() => {
    setOpened(props.opened || false);
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });
  createEffect(
    on(opened, (opened, _, prevTimeoutHandle) => {
      let timeoutHandle: number | undefined = undefined;

      if (prevTimeoutHandle) window.clearTimeout(prevTimeoutHandle as number);
      if (opened) {
        document.documentElement.classList.add("dropdown-opened");
      } else {
        document.documentElement.classList.remove("dropdown-opened");
        timeoutHandle = window.setTimeout(() => {
          setForcedPlacement(null);
          setForcedPosition(null);
          setHeight(0);
        }, 300);
      }

      if (opened && props.autoFocus !== false) {
        computeDropdownPosition();
        boxRef()?.focus();
      }

      return timeoutHandle;
    })
  );
  createEffect((prevTimeoutHandle) => {
    let timeoutHandle: number | undefined = undefined;

    if (prevTimeoutHandle) window.clearTimeout(prevTimeoutHandle as number);
    if (!md() && boxRef()?.contains(activeElement()) && activeElement()?.tagName === "INPUT") {
      setHeight(document.getElementById("dropdowns")?.getBoundingClientRect().height || 0);
      timeoutHandle = window.setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }

    return timeoutHandle;
  });
  createEffect(
    on(opened, (opened) => {
      const handleClick = (event: MouseEvent): void => {
        if (!document.documentElement.classList.contains("dropdown-opened")) return;
        if (
          !boxRef()?.contains(event.target as Node) &&
          !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")
        ) {
          setOpened(false);
        }
      };
      const handleEscape = (event: KeyboardEvent): void => {
        if (event.key === "Escape") {
          setOpened(false);
        }
      };

      if (opened) {
        document.body.addEventListener("pointerdown", handleClick);
        document.body.addEventListener("keydown", handleEscape);
      }

      onCleanup(() => {
        document.body.removeEventListener("pointerdown", handleClick);
        document.body.removeEventListener("keydown", handleEscape);
      });
    })
  );

  return (
    <div
      class={clsx(":base: relative flex items-center focus:outline-none", props.class)}
      style={props.style}
      tabindex="0"
    >
      <Show when={props.activatorButton}>
        <div
          ref={setActivatorWrapperRef}
          onClick={(event) => {
            if (props.attachActivatorHandler !== false) {
              event.stopPropagation();
              event.preventDefault();

              setOpened(!opened());
            }
          }}
          class="contents"
        >
          <Dynamic
            component={props.activatorButton}
            computeDropdownPosition={computeDropdownPosition}
            opened={opened()}
          />
        </div>
      </Show>
      <Dynamic
        component={md() ? "div" : Portal}
        mount={(!md() && document.getElementById("dropdowns")) || undefined}
      >
        <Card
          {...(props.cardProps || {})}
          style={cardStyle()}
          ref={setBoxRef}
          shade={md()}
          class={clsx(
            `:base-2: z-50 flex flex-col p-1 overflow-hidden transform min-w-32 rounded-[0.625rem] pointer-events-auto transition duration-150`,
            props.fixed || (forcedPosition() && forcedPlacement()) ? "fixed" : "absolute",
            opened() ? "" : ":base-2: translate-y-full md:translate-y-0 !shadow-none",
            opened() ? `:base-2: visible md:opacity-100` : `:base-2: invisible md:opacity-0`,
            !md() &&
              ":base-2: fixed !left-0 w-full !max-w-full !max-h-full m-0 p-0 pb-1 outline-0 border-t-2 shadow-none rounded-none !top-unset bottom-0 h-unset",
            md() && "shadow-black shadow-opacity-15",
            props.cardProps?.class
          )}
        >
          <Show when={openedWithDebouncedClose()}>
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
          </Show>
        </Card>
      </Dynamic>
    </div>
  );
};

export { Dropdown, DropdownArea };
