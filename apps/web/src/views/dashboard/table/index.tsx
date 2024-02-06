import { DashboardTableViewDataProvider, useDashboardTableViewData } from "./table-view-context";
import { AddContentPieceGroup, ContentPieceGroup } from "./content-piece-group";
import { DashboardTableViewHeader } from "./table-header";
import { useDashboardData } from "../dashboard-context";
import { Component, Show } from "solid-js";
import { mdiFolder } from "@mdi/js";
import { createRef } from "#lib/utils";
import { Icon, Sortable } from "#components/primitives";
import { ContentLevel, hasPermission, useClient, useContentData } from "#context";
import { ScrollShadow } from "#components/fragments";

const Table: Component = () => {
  const client = useClient();
  const { activeContentGroupId, contentGroups, contentLevels, contentActions } = useContentData();
  const { setActiveDraggableContentGroupId } = useDashboardData();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const { tableWidth } = useDashboardTableViewData();
  const activeContentLevel = (): ContentLevel & { empty?: boolean } => {
    return (
      contentLevels[activeContentGroupId() || ""] || {
        groups: [],
        moreToLoad: false,
        pieces: [],
        empty: true,
        loading: false
      }
    );
  };

  return (
    <>
      <ScrollShadow
        color="contrast"
        direction="horizontal"
        scrollableContainerRef={scrollableContainerRef}
      />
      <div
        class="flex flex-col w-full h-full overflow-x-auto scrollbar-dashboard overscroll-none"
        ref={setScrollableContainerRef}
      >
        <div
          style={{
            "min-width": `${tableWidth()}px`
          }}
        >
          <DashboardTableViewHeader />
          <Sortable
            ids={activeContentLevel().groups}
            ghostClass=":base: border-b-2 border-gray-200 dark:border-gray-700 children:invisible"
            filter=".locked"
            disabled={!hasPermission("manageDashboard")}
            dragImage={(props) => {
              return (
                <div class="flex whitespace-nowrap gap-1 rounded-lg px-1 py-0.5 border-2 bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700">
                  <Icon path={mdiFolder} class="h-6 w-6" />
                  {contentGroups[props.id]?.name}
                </div>
              );
            }}
            onDragStart={(contentGroupId) => {
              setActiveDraggableContentGroupId(contentGroupId);
            }}
            onDragEnd={(newIds, details) => {
              const isMoved =
                activeContentLevel().groups.some((id) => !newIds.includes(id)) ||
                newIds.some((id) => !activeContentLevel().groups.includes(id));
              const isReordered =
                !isMoved && activeContentLevel().groups.join(":") !== newIds.join(":");

              setActiveDraggableContentGroupId(null);

              if (isReordered) {
                const newIndex = newIds.indexOf(details.affectedId);

                client.contentGroups.reorder.mutate({
                  id: details.affectedId,
                  index: newIndex
                });
                contentActions.reorderContentGroup({ id: details.affectedId, index: newIndex });
              }
            }}
            addon={() => {
              return (
                <Show when={hasPermission("manageDashboard")}>
                  <AddContentPieceGroup class="locked" />
                </Show>
              );
            }}
          >
            {(contentGroupId, index, dataProps) => {
              if (contentGroupId && contentGroups[contentGroupId]) {
                return (
                  <ContentPieceGroup
                    contentGroup={contentGroups[contentGroupId]!}
                    dataProps={dataProps()}
                    index={index()}
                    remove={(id) => {
                      if (id) {
                        contentActions.deleteContentGroup({ id });
                      }
                    }}
                  />
                );
              }
            }}
          </Sortable>
        </div>
      </div>
    </>
  );
};
const DashboardTableView: Component = () => {
  return (
    <div class="relative overflow-hidden w-full">
      <DashboardTableViewDataProvider>
        <Table />
      </DashboardTableViewDataProvider>
    </div>
  );
};

export { DashboardTableView };
