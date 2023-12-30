import { ContentGroupColumn, AddContentGroupColumn } from "./content-group-column";
import { useDashboardData } from "../dashboard-context";
import clsx from "clsx";
import { Component, createEffect, createSignal, on, Show } from "solid-js";
import { mdiFolder } from "@mdi/js";
import { Icon, Sortable } from "#components/primitives";
import { createRef } from "#lib/utils";
import { ScrollShadow } from "#components/fragments";
import { hasPermission, useClient, useContentData, ContentLevel } from "#context";

const Kanban: Component = () => {
  const client = useClient();
  const { activeContentGroupId, contentGroups, contentLevels, contentActions } = useContentData();
  const { setActiveDraggableContentGroupId } = useDashboardData();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [snapEnabled, setSnapEnabled] = createSignal(true);
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

  createEffect(
    on(activeContentGroupId, (contentGroupId, previousContentGroupId) => {
      if (contentGroupId === previousContentGroupId) return;

      scrollableContainerRef()!.scrollLeft = 0;

      return contentGroupId;
    })
  );

  return (
    <>
      <ScrollShadow
        scrollableContainerRef={scrollableContainerRef}
        color="contrast"
        direction="horizontal"
      />
      <Sortable
        ids={activeContentLevel().groups}
        ghostClass=":base: border-2 border-gray-200 dark:border-gray-700 children:invisible !p-0 !m-2 !mt-0 !h-unset rounded-2xl"
        filter=".locked"
        disabled={!hasPermission("manageDashboard")}
        class={clsx(
          "flex-1 h-full auto-rows-fr grid-flow-column grid-flow-col grid-template-rows grid auto-cols-[calc(100vw-2.5rem)] md:auto-cols-85 overflow-x-scroll scrollbar-dashboard md:px-5",
          snapEnabled() && `snap-mandatory snap-x`
        )}
        ref={setScrollableContainerRef}
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

          if (isReordered) {
            const newIndex = newIds.indexOf(details.affectedId);

            client.contentGroups.reorder.mutate({
              id: details.affectedId,
              index: newIndex
            });
            contentActions.reorderContentGroup({ id: details.affectedId, index: newIndex });
            setActiveDraggableContentGroupId(null);
          }
        }}
        addon={() => {
          return (
            <Show when={hasPermission("manageDashboard")}>
              <AddContentGroupColumn class="locked" />
            </Show>
          );
        }}
      >
        {(contentGroupId, index, dataProps) => {
          if (contentGroupId && contentGroups[contentGroupId]) {
            return (
              <ContentGroupColumn
                contentGroup={contentGroups[contentGroupId]!}
                dataProps={dataProps()}
                index={index()}
                onDragStart={() => setSnapEnabled(false)}
                onDragEnd={() => setSnapEnabled(true)}
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
    </>
  );
};
const DashboardKanbanView: Component = () => {
  return (
    <div class="relative overflow-hidden pt-5">
      <Kanban />
    </div>
  );
};

export { DashboardKanbanView };
