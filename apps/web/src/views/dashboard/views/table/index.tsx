import { DashboardListViewDataProvider, useDashboardListViewData } from "./list-view-context";
import { ContentPieceList } from "./content-piece-list";
import { DashboardListViewHeader } from "./list-header";
import { ContentGroupsContextProvider } from "../../content-groups-context";
import { Component, For, Show, createEffect, createResource, createSignal, on } from "solid-js";
import { createRef } from "@vrite/components/src/ref";
import { mdiChevronDown, mdiPlus, mdiPlusCircleOutline } from "@mdi/js";
import clsx from "clsx";
import { Heading, IconButton, Loader, Sortable } from "#components/primitives";
import { App, hasPermission, useClient } from "#context";
import { ScrollShadow } from "#components/fragments";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  contentGroupsLoading?: boolean;
  contentGroups: App.ContentGroup<string>[];
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
  setContentGroups(contentGroups: App.ContentGroup<string>[]): void;
}

const List: Component<DashboardListViewProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const { tableWidth } = useDashboardListViewData();
  const [contentPiecesLoading, setContentPiecesLoading] = createSignal(false);
  const client = useClient();
  const [removedContentPieces, setRemovedContentPieces] = createSignal<string[]>([]);
  const [higherAncestor] = createResource(
    () => props.ancestor,
    (ancestor) => {
      const higherAncestorId = ancestor?.ancestors[ancestor.ancestors.length - 1];

      if (!higherAncestorId) return null;

      try {
        return client.contentGroups.get.query({ id: higherAncestorId });
      } catch (error) {
        return null;
      }
    }
  );

  createEffect(
    on(
      () => props.ancestor,
      () => {
        setRemovedContentPieces([]);
      }
    )
  );

  return (
    <div
      class="flex flex-col w-full h-full overflow-x-auto overscroll-none scrollbar-contrast"
      ref={setScrollableContainerRef}
    >
      <ScrollShadow
        color="contrast"
        scrollableContainerRef={scrollableContainerRef}
        offset={{ top: "32px" }}
      />
      <ScrollShadow
        color="contrast"
        direction="horizontal"
        scrollableContainerRef={scrollableContainerRef}
      />
      <div
        style={{
          "min-width": `${tableWidth()}px`
        }}
      >
        <DashboardListViewHeader />
        <Sortable
          each={[...props.contentGroups, null]}
          wrapper="div"
          wrapperProps={{}}
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
                }
              }
            },
            onEnd() {
              const children = [...(scrollableContainerRef()?.children || [])] as HTMLElement[];
              const newItems = children
                .map((v) => {
                  return props.contentGroups.find((contentGroup) => {
                    return contentGroup.id.toString() === (v.dataset.contentGroupId || "");
                  });
                })
                .filter((item) => item) as App.ContentGroup[];

              children.sort(
                (a, b) => parseInt(a.dataset.index || "") - parseInt(b.dataset.index || "")
              );
              scrollableContainerRef()?.replaceChildren(...children);
              props.setContentGroups(newItems);
            }
          }}
          ref={setScrollableContainerRef}
        >
          {(contentGroup) => {
            if (!contentGroup) {
              return (
                <div class="h-12 flex justify-start items-center gap-3 group px-2 border-b-2 border-r-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer">
                  <IconButton path={mdiPlus} class="m-0" variant="text" />
                  <Heading level={3}>Add content group</Heading>
                </div>
              );
            }

            return (
              <ContentPieceList
                ancestor={contentGroup}
                setContentPiecesLoading={setContentPiecesLoading}
                removedContentPieces={removedContentPieces()}
              />
            );
          }}
        </Sortable>
      </div>
      <Show when={props.contentGroupsLoading || contentPiecesLoading() || higherAncestor.loading}>
        <div class="h-full w-full absolute top-0 left-0 bg-gray-100 dark:bg-gray-800 flex justify-center items-center">
          <Loader />
        </div>
      </Show>
    </div>
  );
};
const DashboardTableView: Component<DashboardListViewProps> = (props) => {
  return (
    <div class="relative overflow-hidden w-full">
      <ContentGroupsContextProvider ancestor={() => props.ancestor} setAncestor={props.setAncestor}>
        <DashboardListViewDataProvider>
          <List {...props} />
        </DashboardListViewDataProvider>
      </ContentGroupsContextProvider>
    </div>
  );
};

export { DashboardTableView };
