import { debounce } from "@solid-primitives/scheduled";
import clsx from "clsx";
import { createSignal, createMemo, onCleanup, Component, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { mdiCommentMultipleOutline, mdiFileMultipleOutline, mdiShapeOutline } from "@mdi/js";
import { useContentData, useLocalStorage, useSharedState } from "#context";
import { createRef } from "#lib/utils";
import { ExplorerView } from "#views/explorer";
import { IconButton, Tooltip } from "#components/primitives";
import { SnippetsView } from "#views/snippets";
import { CommentsView } from "#views/comments";

const sidePanelRightViews: Record<
  string,
  {
    view: Component<Record<string, any>>;
    icon: string;
    label: string;
    id: string;
    show?(): boolean;
  }
> = {
  explorer: { view: ExplorerView, icon: mdiFileMultipleOutline, label: "Explorer", id: "explorer" },
  snippets: { view: SnippetsView, icon: mdiShapeOutline, label: "Snippets", id: "snippets" },
  comments: {
    show: () => {
      const { activeContentPieceId } = useContentData();
      const { useSharedSignal } = useSharedState();
      const [sharedEditor] = useSharedSignal("editor");

      return Boolean(activeContentPieceId());
    },
    view: CommentsView,
    icon: mdiCommentMultipleOutline,
    label: "Comments",
    id: "comments"
  }
};
const SidePanelRight: Component = () => {
  const { storage, setStorage } = useLocalStorage();
  const [prevX, setPrevX] = createRef(0);
  const [dragging, setDragging] = createSignal(false);
  const [previousWidth, setPreviousWidth] = createRef(480);
  const [minWidth] = createSignal(375);
  const [maxWidth] = createSignal(640);
  const [handleHover, setHandleHover] = createSignal(false);
  const viewId = createMemo(() => {
    const viewId = storage().sidePanelRightView || "explorer";
    const { show } = sidePanelRightViews[viewId];

    if (show && !show()) return "explorer";

    return viewId;
  });
  const view = (): Component => sidePanelRightViews[viewId() || "explorer"].view;
  const collapsed = createMemo(() => {
    return (storage().rightPanelWidth || 0) < minWidth();
  });
  const triggerHandleHover = debounce(() => {
    setHandleHover(true);
  }, 100);
  const closeOffset = 50;
  const setWidth = (rightPanelWidth: number): void => {
    setStorage((storage) => ({
      ...storage,
      rightPanelWidth
    }));
  };
  const onPointerMove = (event: MouseEvent): void => {
    if (dragging()) {
      const newWidth = previousWidth() + (prevX() || 0) - event.x;

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

  setPreviousWidth(Number(localStorage.getItem("rightPanelWidth")));
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
        "fixed top-0 left-0 !lt-md:w-full flex md:relative h-[calc(100%-3.25rem-env(safe-area-inset-bottom,0px))] md:h-full border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800",
        "transition-transform ease-out duration-350",

        collapsed() && "translate-y-[100vh] md:translate-y-0 z-50",
        !collapsed() && "md:border-l-2 z-20"
      )}
      style={{
        "width": `${storage().rightPanelWidth || 0}px`,
        "max-width": `${maxWidth()}px`
      }}
    >
      <div class={clsx("flex-1 w-full relative", collapsed() && "md:hidden")}>
        <div class="h-full flex flex-col">
          <div class="px-5 pt-3 flex gap-1.5">
            <For each={Object.values(sidePanelRightViews)}>
              {(view) => {
                return (
                  <Show when={!view.show || view.show()}>
                    <Tooltip text={view.label} class="mt-1">
                      <IconButton
                        path={view.icon}
                        color={view.id === viewId() ? "primary" : "base"}
                        text={view.id === viewId() ? "primary" : "soft"}
                        class="m-0"
                        iconProps={{ class: "h-5 w-5" }}
                        variant={view.id === viewId() ? "solid" : "text"}
                        onClick={() => {
                          setStorage((storage) => ({
                            ...storage,
                            sidePanelRightView: view.id
                          }));
                        }}
                      />
                    </Tooltip>
                  </Show>
                );
              }}
            </For>
          </div>
          <div class="flex-1 overflow-hidden">
            <Dynamic component={view()} />
          </div>
        </div>
      </div>
      <div
        class={clsx(
          "w-4 cursor-col-resize flex justify-start items-center absolute -left-0.5 top-0 h-full z-60"
        )}
        onPointerDown={(event) => {
          setDragging(true);
          setPreviousWidth(storage().rightPanelWidth || 0);
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
            "w-1 fixed h-full bg-gradient-to-tr transition-opacity duration-350",
            collapsed() ? "-ml-0.75" : "-ml-0.25",
            dragging() || handleHover() ? "opacity-100" : "opacity-0"
          )}
        ></div>
      </div>
    </div>
  );
};

export { SidePanelRight };
