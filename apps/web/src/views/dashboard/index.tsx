import { AddColumn, Column } from "./column";
import { ColumnsContextProvider } from "./columns-context";
import { Component, Show, createEffect, createSignal, on, onCleanup } from "solid-js";
import clsx from "clsx";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { Sortable } from "#components/primitives";
import {
  App,
  hasPermission,
  useAuthenticatedContext,
  useClientContext,
  useUIContext,
  useCacheContext
} from "#context";
import { ScrollShadow } from "#components/fragments";
import { createRef, getSelectionColor } from "#lib/utils";

const DashboardView: Component = () => {
  const { useContentGroups } = useCacheContext();
  const { workspace, profile } = useAuthenticatedContext();
  const { contentGroups, setContentGroups } = useContentGroups();
  const { storage, setStorage, setReferences } = useUIContext();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const { client } = useClientContext();
  const [snapEnabled, setSnapEnabled] = createSignal(true);
  const ydoc = new Y.Doc();
  const provider = new HocuspocusProvider({
    token: "vrite",
    url: `ws${window.location.protocol.includes("https") ? "s" : ""}://${
      import.meta.env.PUBLIC_COLLAB_HOST
    }`,
    name: `workspace:${workspace()?.id || ""}`,
    document: ydoc
  });

  provider.awareness.setLocalStateField("user", {
    name: profile()?.username || "",
    avatar: profile()?.avatar || "",
    id: profile()?.id || "",
    selectionColor: getSelectionColor()
  });
  setReferences({ provider });
  onCleanup(() => {
    setReferences({ provider: undefined });
    provider.destroy();
  });
  setStorage((storage) => ({ ...storage, toolbarView: "default" }));
  createEffect(
    on(storage, (storage, previousContentPieceId) => {
      if (storage.contentPieceId !== previousContentPieceId) {
        provider.awareness.setLocalStateField("contentPieceId", storage.contentPieceId);
      }

      return storage.contentPieceId;
    })
  );

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full pt-5 pb-2.5">
      <div class="relative overflow-hidden">
        <ScrollShadow
          scrollableContainerRef={scrollableContainerRef}
          color="contrast"
          direction="horizontal"
          offset="1.25rem"
        />
        <ColumnsContextProvider>
          <Sortable
            each={[...contentGroups(), null]}
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
                    client.contentGroups.move.mutate({
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
                    return contentGroups().find((contentGroup) => {
                      return contentGroup.id.toString() === (v.dataset.contentGroupId || "");
                    });
                  })
                  .filter((item) => item) as App.ContentGroup[];

                children.sort(
                  (a, b) => parseInt(a.dataset.index || "") - parseInt(b.dataset.index || "")
                );
                scrollableContainerRef()?.replaceChildren(...children);
                setContentGroups(newItems);
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
            {(contentGroup, index) => {
              if (contentGroup) {
                return (
                  <Column
                    contentGroup={contentGroup}
                    index={index()}
                    onDragStart={() => setSnapEnabled(false)}
                    onDragEnd={() => setSnapEnabled(true)}
                  />
                );
              }

              return (
                <Show when={hasPermission("manageDashboard")}>
                  <AddColumn class="locked" />
                </Show>
              );
            }}
          </Sortable>
        </ColumnsContextProvider>
      </div>
    </div>
  );
};

export { DashboardView };
