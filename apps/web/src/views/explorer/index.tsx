import { TreeLevel } from "./tree-level";
import { ExplorerDataProvider, useExplorerData } from "./explorer-context";
import { Component } from "solid-js";
import { mdiClose, mdiHexagonSlice6 } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { useNavigate } from "@solidjs/router";
import SortableLib from "sortablejs";
import { Heading, IconButton } from "#components/primitives";
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
      <div class={"flex justify-start items-start mb-2 px-2 pr-5 flex-col pt-5"}>
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
        >
          <IconButton
            class="m-0 py-0 !font-normal"
            path={mdiHexagonSlice6}
            variant={colored() ? "solid" : "text"}
            text={colored() ? "primary" : "soft"}
            color={colored() ? "primary" : "base"}
            size="small"
            onClick={() => {
              setActiveContentGroupId(null);
              navigate(`/${activeContentPieceId() || ""}`);
            }}
            label={<span class="flex-1 clamp-1 ml-1">{workspace()?.name}</span>}
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
          />
        </div>
      </div>
      <div class="relative overflow-hidden flex-1">
        <div
          class="flex flex-col w-full h-full overflow-y-auto scrollbar-sm-contrast pb-5"
          ref={setScrollableContainerRef}
        >
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <div>
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
