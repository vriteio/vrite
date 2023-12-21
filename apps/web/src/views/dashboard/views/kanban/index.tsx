import { ContentGroupColumn, AddContentGroupColumn } from "./content-group-column";
import clsx from "clsx";
import { Component, createEffect, createSignal, on, Show } from "solid-js";
import { Sortable } from "#components/primitives";
import { createRef } from "#lib/utils";
import { ScrollShadow } from "#components/fragments";
import { hasPermission, useClient, useContentData, ContentLevel } from "#context";

const DashboardKanbanView: Component = () => {
  const client = useClient();
  const { activeContentGroupId, contentGroups, contentLevels, contentActions } = useContentData();
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
    <div class="relative overflow-hidden pt-5 pb-2.5">
      <ScrollShadow
        scrollableContainerRef={scrollableContainerRef}
        color="contrast"
        direction="horizontal"
        offset="1.25rem"
      />
      <Sortable
        each={[...activeContentLevel().groups, null]}
        wrapper="div"
        options={{
          ghostClass: `:base: border-4 border-gray-200 opacity-50 dark:border-gray-700 children:invisible !p-0 !m-2 !mt-0 !h-unset rounded-2xl`,
          filter: ".locked",
          disabled: !hasPermission("manageDashboard"),
          fallbackOnBody: true,
          onMove(event) {
            return !event.related.classList.contains("locked");
          },
          onUpdate(event) {
            if (typeof event.oldIndex === "number" && typeof event.newIndex === "number") {
              const id = event.item.dataset.contentGroupId;

              if (id) {
                client.contentGroups.reorder.mutate({
                  id,
                  index: event.newIndex
                });
                contentActions.reorderContentGroup({ id, index: event.newIndex });
              }
            }
          },
          onStart() {
            setSnapEnabled(false);
          },
          onEnd() {
            setSnapEnabled(true);

            const children = [...(scrollableContainerRef()?.children || [])] as HTMLElement[];

            children.sort(
              (a, b) => parseInt(a.dataset.index || "") - parseInt(b.dataset.index || "")
            );
            scrollableContainerRef()?.replaceChildren(...children);
          }
        }}
        ref={setScrollableContainerRef}
        wrapperProps={{
          class: clsx(
            "flex-1 h-full auto-rows-fr grid-flow-column grid-flow-col grid-template-rows grid auto-cols-[calc(100vw-2.5rem)] md:auto-cols-85 overflow-x-scroll scrollbar-sm-contrast md:mx-5",
            snapEnabled() && `snap-mandatory snap-x`
          )
        }}
      >
        {(contentGroupId, index) => {
          if (contentGroupId && contentGroups[contentGroupId]) {
            return (
              <ContentGroupColumn
                contentGroup={contentGroups[contentGroupId]!}
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

          return (
            <Show when={hasPermission("manageDashboard")}>
              <AddContentGroupColumn class="locked" />
            </Show>
          );
        }}
      </Sortable>
    </div>
  );
};

export { DashboardKanbanView };
