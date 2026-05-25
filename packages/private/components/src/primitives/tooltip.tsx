import { Fragment } from "./fragment";
import { createRef } from "../ref";
import clsx from "clsx";
import {
  Component,
  createEffect,
  createSignal,
  JSX,
  onMount,
  Show,
  on,
  onCleanup,
  createContext,
  ParentComponent,
  useContext,
  createMemo
} from "solid-js";
import { computePosition, autoUpdate } from "@floating-ui/dom";
import { Dynamic, Portal } from "solid-js/web";
import { createMediaQuery } from "@solid-primitives/media";
import { createScheduled, debounce } from "@solid-primitives/scheduled";

type TooltipPosition = {
  x: number;
  y: number;
};
type PositionUpdateHandler = (position?: TooltipPosition) => void;

interface TooltipController {
  updatePosition(position?: TooltipPosition): void;
  onPositionUpdate(handler: PositionUpdateHandler): void;
}
interface TooltipProps {
  children: JSX.Element;
  text: JSX.Element;
  class?: string;
  side?: "top" | "bottom" | "left" | "right";
  enabled?: boolean;
  fixed?: boolean;
  controller?: TooltipController;
  autoUpdate?: boolean;
  wrapperClass?: string;
  visible?: boolean;
  setVisible?(visible: boolean): void;
}

const createTooltipController = (): TooltipController => {
  const handlers: PositionUpdateHandler[] = [];

  return {
    onPositionUpdate(handler) {
      handlers.push(handler);
    },
    updatePosition(position) {
      handlers.forEach((handler) => {
        handler(position);
      });
    }
  };
};
const TooltipContext = createContext<{
  tooltipsEnabled(): boolean;
  setTooltipsEnabled(tooltipsEnabled: boolean): void;
}>({
  tooltipsEnabled: () => true,
  setTooltipsEnabled: () => {}
});
const Tooltip: Component<TooltipProps> = (props) => {
  const { tooltipsEnabled, setTooltipsEnabled } = useContext(TooltipContext);
  const [position, setPosition] = createSignal<TooltipPosition>({ x: 0, y: 0 });
  const [referenceRef, setReferenceRef] = createRef<HTMLElement | null>(null);
  const [floatingRef, setFloatingRef] = createRef<HTMLElement | null>(null);
  const [cleanupRef, setCleanupRef] = createRef<() => void>(() => {});
  const [visible, setVisible] = createSignal(false);
  const md = createMediaQuery("(min-width: 768px)");
  const scheduled = createScheduled((fn) => debounce(fn, 500));
  const debouncedTooltipsEnabled = createMemo((previous) => {
    return scheduled() ? tooltipsEnabled() : previous;
  }, tooltipsEnabled());
  const transitionEnabled = createMemo(() => {
    if (tooltipsEnabled() && !debouncedTooltipsEnabled()) {
      return true;
    }
    if (!tooltipsEnabled() && debouncedTooltipsEnabled()) {
      return true;
    }

    return !debouncedTooltipsEnabled();
  });
  const controller = props.controller || createTooltipController();
  const enabled = (): boolean => {
    return typeof props.enabled === "boolean" ? props.enabled : true;
  };
  const side = () => props.side || "bottom";
  const updatePosition = async (): Promise<void> => {
    const referenceElement = referenceRef();
    const floatingElement = floatingRef();

    if (referenceElement && floatingElement) {
      const { x, y } = await computePosition(referenceElement, floatingElement, {
        strategy: props.fixed ? "fixed" : "absolute",
        placement: side()
      });

      setPosition({ x: x || 0, y: y || 0 });
    }
  };
  const onPointerMove = (): void => {
    if (referenceRef()?.matches(":hover") && md()) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  };

  if (typeof document !== "undefined") {
    document.body.addEventListener("pointermove", onPointerMove);
  }

  controller.onPositionUpdate(updatePosition);
  onMount(() => {
    const referenceElement = referenceRef();
    const floatingElement = floatingRef();

    if (referenceElement && floatingElement) {
      const cleanup = autoUpdate(referenceElement, floatingElement, controller.updatePosition, {
        ancestorResize: false,
        ancestorScroll: false
      });

      setCleanupRef(cleanup);
    }
  });
  createEffect(
    on([side, () => props.enabled, () => props.fixed], () => {
      controller.updatePosition();
    })
  );
  createEffect(
    on(
      () => props.visible,
      (value) => {
        setVisible(typeof value === "undefined" ? visible() : value);
      }
    )
  );
  createEffect(
    on(visible, (value) => {
      props.setVisible?.(value);
      setTooltipsEnabled(value);
    })
  );
  createEffect(
    on([visible, () => props.fixed], ([visible, fixed]) => {
      if (visible && fixed) {
        controller.updatePosition();
      }
    })
  );
  onCleanup(() => {
    cleanupRef()?.();

    if (typeof document !== "undefined") {
      document.body.removeEventListener("pointermove", onPointerMove);
    }
  });

  return (
    <div
      class={clsx(`:base: relative flex flex-col items-center justify-center`, props.wrapperClass)}
      ref={setReferenceRef}
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      onPointerDown={() => setVisible(false)}
    >
      {props.children}
      <Show when={enabled()}>
        <Dynamic component={props.fixed ? Portal : Fragment}>
          <div
            ref={setFloatingRef}
            style={{ left: `${position().x}px`, top: `${position().y}px` }}
            class={clsx(
              `:base: relative hidden md:block text-xs whitespace-nowrap py-1 px-1.5 leading-none dark:bg-gray-50 dark:text-gray-800 rounded-md bg-gray-800 text-gray-50 z-60 pointer-events-none ring-1 ring-gray-900 dark:ring-gray-200 shadow-inner shadow-gray-900 dark:shadow-gray-200`,
              {
                ":base: transition delay-100 duration-100": transitionEnabled(),
                ":base: group-hover:scale-100 group-hover:opacity-100":
                  visible() && tooltipsEnabled(),
                ":base: scale-90 opacity-0": !visible() || !tooltipsEnabled(),
                ":base: origin-top mt-1.5": side() === "bottom",
                ":base: origin-bottom mb-1.5": side() === "top",
                ":base: origin-left ml-1.5": side() === "right",
                ":base: origin-right mr-1.5": side() === "left"
              },
              props.fixed ? `:base: fixed` : `:base: absolute`,
              props.class
            )}
          >
            {props.text}
            <div class="absolute h-full w-full top-0 left-0 shadow-md shadow-gray-900 dark:shadow-gray-200 shadow-opacity-20 dark:shadow-opacity-20 -z-1 rounded-md" />
          </div>
        </Dynamic>
      </Show>
    </div>
  );
};
const TooltipProvider: ParentComponent = (props) => {
  const [tooltipsEnabled, setTooltipsEnabled] = createSignal(false);

  let timeoutHandle = 0;
  let recentlyDisabled = false;

  return (
    <TooltipContext.Provider
      value={{
        tooltipsEnabled,
        setTooltipsEnabled(newValue) {
          clearTimeout(timeoutHandle);

          if (newValue && !tooltipsEnabled() && !recentlyDisabled) {
            timeoutHandle = window.setTimeout(() => {
              setTooltipsEnabled(newValue);
            }, 500);
          } else if (!newValue && tooltipsEnabled()) {
            recentlyDisabled = true;
            timeoutHandle = window.setTimeout(() => {
              recentlyDisabled = false;
            }, 250);
            setTooltipsEnabled(newValue);
          } else {
            setTooltipsEnabled(newValue);
          }
        }
      }}
    >
      {props.children}
    </TooltipContext.Provider>
  );
};

const useTooltipContext = () => useContext(TooltipContext);

export { Tooltip, TooltipProvider, createTooltipController, useTooltipContext };
