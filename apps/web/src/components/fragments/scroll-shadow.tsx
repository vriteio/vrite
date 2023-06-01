import clsx from "clsx";
import { Component, createSignal, onCleanup, onMount } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { Ref } from "#lib/utils";

type ProcessScrollHandler = () => void;

interface ScrollShadowController {
  processScrollState(): void;
  onProcessScrollState(handler: ProcessScrollHandler): void;
}
interface ScrollShadowProps {
  scrollableContainerRef: Ref<HTMLElement | null>[0];
  controller?: ScrollShadowController;
  direction?: "horizontal" | "vertical";
  color?: "contrast" | "base";
  offset?: string;
  onScrollEnd?(): void;
}

const createScrollShadowController = (): ScrollShadowController => {
  const handlers: ProcessScrollHandler[] = [];

  return {
    onProcessScrollState(handler) {
      handlers.push(handler);
    },
    processScrollState() {
      handlers.forEach((handler) => {
        handler();
      });
    }
  };
};
const ScrollShadow: Component<ScrollShadowProps> = (props) => {
  const controller = props.controller || createScrollShadowController();
  const [scrollState, setScrollState] = createSignal<"start" | "mid" | "end" | "none">("none");
  const resizeObserver = new ResizeObserver(() => {
    controller.processScrollState();
  });
  const onScrollEnd = debounce(() => props.onScrollEnd?.(), 250);
  const processScrollState = (element: HTMLElement): void => {
    onScrollEnd.clear();

    if (props.direction === "horizontal") {
      if (element.clientWidth >= element.scrollWidth) {
        setScrollState("none");
      } else if (element.scrollLeft === 0) {
        setScrollState("start");
      } else if (Math.abs(element.scrollLeft + element.clientWidth - element.scrollWidth) < 10) {
        setScrollState("end");
        onScrollEnd();
      } else {
        setScrollState("mid");
      }

      return;
    }

    if (element.clientHeight >= element.scrollHeight) {
      setScrollState("none");
    } else if (element.scrollTop === 0) {
      setScrollState("start");
    } else if (Math.abs(element.scrollTop + element.clientHeight - element.scrollHeight) < 10) {
      setScrollState("end");
      onScrollEnd?.();
    } else {
      setScrollState("mid");
    }
  };
  const debouncedScrollStateUpdate = debounce(() => {
    controller.processScrollState();
  }, 250);
  const handleWindowResize = () => {
    debouncedScrollStateUpdate.clear();
    debouncedScrollStateUpdate();
  };

  controller.onProcessScrollState(() => {
    const scrollableContainer = props.scrollableContainerRef();

    if (scrollableContainer) {
      processScrollState(scrollableContainer);
    }
  });
  onMount(() => {
    const scrollableContainer = props.scrollableContainerRef();

    if (scrollableContainer) {
      scrollableContainer.addEventListener("scroll", () => {
        controller.processScrollState();
      });
      resizeObserver.observe(scrollableContainer);
      controller.processScrollState();
    }
  });
  window.addEventListener("resize", handleWindowResize);

  onCleanup(() => {
    window.removeEventListener("resize", handleWindowResize);
    resizeObserver.disconnect();
  });

  return (
    <>
      <div
        class={clsx(
          "pointer-events-none absolute z-1 to-transparent duration-150 transition-opacity",
          props.direction === "horizontal" && "h-full w-8 bg-gradient-to-r",
          props.direction !== "horizontal" && "h-16 w-full bg-gradient-to-b",
          props.color === "contrast" && "from-gray-100 dark:from-gray-800",
          props.color !== "contrast" && "from-gray-50 dark:from-gray-900",
          ["start", "none"].includes(scrollState()) && "opacity-0"
        )}
        style={{
          [props.direction === "horizontal" ? "left" : "top"]: props.offset || "0"
        }}
      />
      <div
        class={clsx(
          "pointer-events-none absolute z-1 to-transparent duration-150 transition-opacity",
          props.direction === "horizontal" && "h-full w-8 bg-gradient-to-l",
          props.direction !== "horizontal" && "h-16 w-full bg-gradient-to-t",
          props.color === "contrast" && "from-gray-100 dark:from-gray-800",
          props.color !== "contrast" && "from-gray-50 dark:from-gray-900",
          ["end", "none"].includes(scrollState()) && "opacity-0"
        )}
        style={{
          [props.direction === "horizontal" ? "right" : "bottom"]: props.offset || "0"
        }}
      />
    </>
  );
};

export { ScrollShadow, createScrollShadowController };
