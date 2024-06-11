import { TreeLevel } from "./tree-level";
import { ExplorerDataProvider, useExplorerData } from "./explorer-context";
import { Component } from "solid-js";
import { mdiClose, mdiHexagonSlice6 } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { useNavigate } from "@solidjs/router";
import SortableLib from "sortablejs";
import clsx from "clsx";
import { Heading, Icon, IconButton } from "#components/primitives";
import { useAuthenticatedUserData, useContentData, useLocalStorage } from "#context";
import { ScrollShadow } from "#components/fragments";

const ExplorerTree: Component = () => {
  const { activeContentGroupId, activeContentPieceId, setActiveContentGroupId, contentGroups } =
    useContentData();
  const {
    highlight,
    setHighlight,
    activeDraggableContentGroupId,
    activeDraggableContentPieceId,
    pathnameData
  } = useExplorerData();
  const { setStorage } = useLocalStorage();
  const { workspace } = useAuthenticatedUserData();
  const navigate = useNavigate();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const handleHighlight = (event: DragEvent | MouseEvent | TouchEvent, groupId: string): void => {
    const draggableGroupId = activeDraggableContentGroupId();
    const draggableGroup = contentGroups[draggableGroupId || ""];

    if (draggableGroup) {
      if (groupId !== draggableGroup.id && (draggableGroup?.ancestors.at(-1) || "") !== groupId) {
        setHighlight(groupId);
      } else {
        setHighlight(null);
      }
    } else {
      setHighlight((highlight) => (highlight === groupId ? "" : highlight));
    }

    event.stopPropagation();
  };
  const active = (): boolean => activeContentGroupId() === null;
  const highlighted = (): boolean => highlight() === "";
  const colored = (): boolean => {
    return (
      highlighted() ||
      (active() &&
        !activeDraggableContentGroupId() &&
        !activeDraggableContentPieceId() &&
        pathnameData().view === "dashboard")
    );
  };

  return (
    <div class="relative overflow-hidden w-full pl-3 flex flex-col">
      <div class={"flex justify-start items-start mb-1 px-2 pr-5 flex-col"}>
        <div class="flex justify-center items-center w-full">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                rightPanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1 flex-1">
            Explorer
          </Heading>
        </div>
        <div
          ref={(el) => {
            SortableLib.create(el, {
              group: {
                name: "shared"
              },
              disabled: true
            });
          }}
        ></div>
      </div>
      <div class="relative overflow-hidden flex-1">
        <div
          class="flex flex-col w-full h-full overflow-y-auto scrollbar-sm-contrast pb-5"
          ref={setScrollableContainerRef}
        >
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <div class="pl-2">
            <div
              class={clsx(
                "pl-0.5 h-7 flex items-center rounded-l-md",
                !activeDraggableContentGroupId() &&
                  !active() &&
                  "@hover:bg-gray-200 dark:@hover-bg-gray-700"
              )}
            >
              <button
                class="flex flex-1"
                onClick={() => {
                  setActiveContentGroupId(null);
                  navigate(`/${activeContentPieceId() || ""}`);
                }}
                data-content-group-id={""}
                onDragEnter={(event) => {
                  handleHighlight(event, "");
                }}
                onDragLeave={(event) => {
                  if (
                    event.relatedTarget instanceof HTMLElement &&
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    setHighlight((highlight) => (highlight === "" ? "" : highlight));
                  }
                }}
                onTouchMove={(event) => {
                  const x = event.touches[0].clientX;
                  const y = event.touches[0].clientY;
                  const elementAtTouchPoint = document.elementFromPoint(x, y);
                  const closestLevel = elementAtTouchPoint?.closest(
                    "[data-content-group-id]"
                  ) as HTMLElement | null;

                  if (closestLevel) {
                    const contentGroup = contentGroups[closestLevel.dataset.contentGroupId!];

                    if (contentGroup) {
                      handleHighlight(event, contentGroup.id);
                    }
                  }
                }}
                onPointerLeave={(event) => {
                  if (activeDraggableContentGroupId()) {
                    setHighlight((highlight) => (highlight === "" ? "" : highlight));
                  }
                }}
              >
                <Icon
                  class={clsx(
                    "h-6 w-6 mr-1",
                    colored() ? "fill-[url(#gradient)]" : "text-gray-500 dark:text-gray-400"
                  )}
                  path={mdiHexagonSlice6}
                />
                <span
                  class={clsx(
                    "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none clamp-1",
                    highlighted() ||
                      (colored() && "text-transparent bg-clip-text bg-gradient-to-tr")
                  )}
                  title={workspace()?.name}
                >
                  {workspace()?.name}
                </span>
              </button>
            </div>
            <TreeLevel />
          </div>
        </div>
      </div>
    </div>
  );
};
const ExplorerView: Component = () => {
  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <ExplorerDataProvider>
        <ExplorerTree />
      </ExplorerDataProvider>
    </div>
  );
};

export { ExplorerView };
