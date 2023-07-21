import { AddColumn, Column } from "./column";
import { ContentGroupsContextProvider } from "./content-groups-context";
import {
  Component,
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
  on,
  onCleanup
} from "solid-js";
import clsx from "clsx";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { mdiChevronRight, mdiFolder, mdiHexagonSlice6 } from "@mdi/js";
import { Button, Card, IconButton, Sortable } from "#components/primitives";
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
  const { contentGroups, setContentGroups, refetch } = useContentGroups();
  const { storage, setStorage, setReferences } = useUIContext();
  const { client } = useClientContext();
  const [snapEnabled, setSnapEnabled] = createSignal(true);
  const [ancestor, setAncestor] = createSignal<App.ContentGroup | null>(null);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
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
  setReferences({ provider, ancestor: ancestor(), setAncestor });
  onCleanup(() => {
    setReferences({ provider: undefined, ancestor: undefined, setAncestor: undefined });
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
  createEffect(
    on(ancestor, (ancestor) => {
      setReferences({ ancestor });
      refetch(ancestor?.id);
    })
  );

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <div class="relative overflow-hidden w-full">
        <ScrollShadow
          scrollableContainerRef={scrollableContainerRef}
          color="contrast"
          direction="horizontal"
          offset="1.25rem"
        />
        <ContentGroupsContextProvider ancestor={ancestor} setAncestor={setAncestor}>
          <Sortable
            each={[...contentGroups()]}
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
              class: clsx("flex flex-col w-full h-full")
            }}
          >
            {(contentGroup, index) => {
              if (contentGroup) {
                return (
                  <button
                    onClick={() => {
                      setAncestor(contentGroup);
                    }}
                  >
                    <Card class="m-0 border-x-0 border-t-0 rounded-none flex justify-start items-center hover:bg-gray-200 hover:cursor-pointer">
                      <IconButton path={mdiFolder} variant="text" text="soft" hover={false} badge />
                      {contentGroup.name}
                    </Card>
                  </button>
                );
              }
            }}
          </Sortable>
        </ContentGroupsContextProvider>
      </div>
    </div>
  );
};

export { DashboardView };
