import { ContentGroupsContextProvider } from "../../content-groups-context";
import { Component, createSignal } from "solid-js";
import clsx from "clsx";
import {
  mdiDotsVertical,
  mdiFileDocument,
  mdiFileDocumentPlus,
  mdiFolder,
  mdiFolderPlus,
  mdiLock,
  mdiPencil
} from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { Card, IconButton, Sortable } from "#components/primitives";
import { App, hasPermission, useClient } from "#context";
import { ScrollShadow } from "#components/fragments";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  contentGroups: App.ContentGroup<string>[];
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
  setContentGroups(contentGroups: App.ContentGroup<string>[]): void;
}

const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const client = useClient();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [snapEnabled, setSnapEnabled] = createSignal(true);

  return (
    <div class="relative overflow-hidden w-full">
      <ContentGroupsContextProvider ancestor={() => props.ancestor} setAncestor={props.setAncestor}>
        <Sortable
          each={[null, ...props.contentGroups]}
          wrapper="div"
          options={{
            ghostClass: `:base: border-4 border-gray-200 opacity-50 dark:border-gray-700 children:invisible !p-0 !m-2 !mt-0 !h-unset rounded-2xl`,
            filter: ".locked",
            preventOnFilter: false,
            fallbackOnBody: true,
            scroll: true,
            scrollSpeed: 10,
            scrollSensitivity: 100,
            disabled: !hasPermission("manageDashboard"),
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
            onStart() {
              setSnapEnabled(false);
            },
            onEnd() {
              setSnapEnabled(true);

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
          wrapperProps={{
            class: clsx("flex flex-col w-full h-full")
          }}
        >
          {(contentGroup, index) => {
            if (typeof contentGroup === "number") {
              return (
                <button>
                  <Card class="m-0 border-x-0 border-t-0 rounded-none justify-start items-center hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer pl-4 flex bg-transparent">
                    <div class="flex-1 flex justify-start items-center">
                      <IconButton
                        path={mdiFileDocument}
                        variant="text"
                        text="soft"
                        hover={false}
                        badge
                      />
                      Welcome to Vrite!
                    </div>
                    <IconButton path={mdiPencil} variant="text" text="soft" />
                  </Card>
                </button>
              );
            }

            if (contentGroup) {
              return (
                <>
                  <button
                    onClick={() => {
                      props.setAncestor(contentGroup);
                    }}
                  >
                    <Card class="m-0 border-x-0 border-t-0 rounded-none flex justify-start items-center hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer pl-4">
                      <IconButton
                        path={index() === 1 ? mdiLock : mdiFolder}
                        variant="text"
                        text={index() === 1 ? "base" : "soft"}
                        color={index() === 1 ? "primary" : "base"}
                        hover={false}
                        badge
                      />
                      <span class="flex-1 text-start">{contentGroup.name}</span>
                      <IconButton path={mdiDotsVertical} variant="text" text="soft" />
                    </Card>
                  </button>
                </>
              );
            }

            return (
              <>
                <button
                  onClick={() => {
                    props.setAncestor(contentGroup);
                  }}
                >
                  <Card class="m-0 border-x-0 border-t-0 rounded-none flex justify-start items-center hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer pl-4">
                    <IconButton path={mdiFolder} variant="text" text="soft" hover={false} badge />
                    ..
                  </Card>
                </button>
              </>
            );
          }}
        </Sortable>
        <Card class="flex fixed bottom-18 md:bottom-4 right-4 m-0 gap-2" color="soft">
          <IconButton
            path={mdiFileDocumentPlus}
            class="whitespace-nowrap w-full m-0 justify-start"
            text="soft"
            variant="text"
            color="base"
            label="New content piece"
          />
          <IconButton
            path={mdiFolderPlus}
            class="whitespace-nowrap w-full m-0 justify-start"
            text="soft"
            variant="text"
            color="base"
            label="New group"
          />
        </Card>
      </ContentGroupsContextProvider>
    </div>
  );
};

export { DashboardListView };
