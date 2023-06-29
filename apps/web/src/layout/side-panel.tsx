import { debounce } from "@solid-primitives/scheduled";
import clsx from "clsx";
import { createSignal, createMemo, onCleanup, Component } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useUIContext } from "#context";
import { createRef } from "#lib/utils";
import { ContentPieceView } from "#views/content-piece";
import { SettingsView } from "#views/settings/view";
import { GettingStartedView } from "#views/getting-started";
import { ExtensionsView } from "#views/extensions";

const sidePanelViews: Record<string, Component<Record<string, any>>> = {
  contentPiece: () => {
    return <ContentPieceView />;
  },
  settings: () => {
    return <SettingsView />;
  },
  extensions: () => {
    return <ExtensionsView />;
  },
  default: () => {
    return <GettingStartedView />;
  }
};
const SidePanel: Component = () => {
  const { storage, setStorage } = useUIContext();
  const [prevX, setPrevX] = createRef(0);
  const [dragging, setDragging] = createSignal(false);
  const [previousWidth, setPreviousWidth] = createRef(480);
  const [minWidth] = createSignal(375);
  const [maxWidth] = createSignal(640);
  const [handleHover, setHandleHover] = createSignal(false);
  const view = createMemo(() => sidePanelViews[storage().sidePanelView || ""]);
  const collapsed = createMemo(() => {
    return (storage().sidePanelWidth || 0) < minWidth();
  });
  const sidePanelEnabled = createMemo(() => {
    if (!storage().sidePanelView) return false;
    if (storage().sidePanelView === "contentPiece" && !storage().contentPieceId) return false;

    return true;
  });
  const triggerHandleHover = debounce(() => {
    setHandleHover(true);
  }, 100);
  const closeOffset = 50;
  const setWidth = (sidePanelWidth: number): void => {
    setStorage((storage) => ({
      ...storage,
      sidePanelWidth
    }));
  };
  const onPointerMove = (event: MouseEvent): void => {
    if (dragging()) {
      const newWidth = previousWidth() - (prevX() || 0) + event.x;

      if (newWidth > minWidth()) {
        setWidth(Math.min(maxWidth(), newWidth));
      } else if (previousWidth() < minWidth() && newWidth >= closeOffset) {
        setWidth(minWidth());
      } else if (newWidth < minWidth() - closeOffset) {
        setWidth(0);
      } else {
        setWidth(minWidth());
      }

      event.preventDefault();
      event.stopPropagation();
    }
  };
  const onPointerUp = (): void => {
    setDragging(false);
  };
  const onPointerLeave = (): void => {
    setDragging(false);
  };

  setPreviousWidth(Number(localStorage.getItem("sidePanelWidth")));
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointerleave", onPointerLeave);
  onCleanup(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointerleave", onPointerLeave);
  });

  return (
    <div
      class={clsx(
        "relative h-full border-gray-200 dark:border-gray-700",
        sidePanelEnabled() ? "flex" : "hidden",
        !collapsed() && "border-r-2"
      )}
      color="contrast"
      style={{
        "width": `${storage().sidePanelWidth || 0}px`,
        "max-width": `${maxWidth()}px`
      }}
    >
      <div class={clsx("flex-1 w-full relative", collapsed() && "hidden")}>
        <div class="h-full">
          <Dynamic component={view()} />
        </div>
      </div>
      <div
        class={clsx(
          "w-4 cursor-col-resize flex justify-start items-center absolute -right-4 top-0 h-full z-50"
        )}
        onPointerDown={(event) => {
          setDragging(true);
          setPreviousWidth(storage().sidePanelWidth || 0);
          setPrevX(event.x);
        }}
        onPointerEnter={() => {
          triggerHandleHover();
        }}
        onPointerLeave={() => {
          triggerHandleHover.clear();
          setHandleHover(false);
        }}
      >
        <div
          class={clsx(
            "w-1 -ml-0.25 fixed h-full bg-gradient-to-tr transition-opacity duration-200",
            dragging() || handleHover() ? "opacity-100" : "opacity-0"
          )}
        ></div>
      </div>
    </div>
  );
};

export { SidePanel };
