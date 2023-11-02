import { ContentPieceRow } from "./content-piece-row";
import { ContentGroupRow } from "./content-group-row";
import { ContentGroupsContextProvider } from "./content-groups-context";
import { Component, For, Show, createSignal } from "solid-js";
import { mdiClose } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { createStore } from "solid-js/store";
import clsx from "clsx";
import { group } from "console";
import { Heading, IconButton, Loader } from "#components/primitives";
import { App, useClient, useLocalStorage, useSharedState } from "#context";
import { ScrollShadow } from "#components/fragments";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  contentGroupsLoading?: boolean;
  contentGroups: App.ContentGroup<string>[];
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
  setContentGroups(contentGroups: App.ContentGroup<string>[]): void;
}

type Level = {
  groups: App.ContentGroup[];
  pieces: Array<App.ExtendedContentPieceWithAdditionalData<"locked" | "order">>;
};

const LevelTree: Component<{
  parentId?: string;
  levels: Record<string, Level>;
  openedLevels: string[];
  loadLevel(parentId: string, preload?: boolean): void;
  removeContentGroup(id: string): void;
  removeContentPiece(id: string): void;
  setOpenedLevels(openedLevels: string[]): void;
}> = (props) => {
  const { storage, setStorage } = useLocalStorage();
  const createSharedSignal = useSharedState();
  const [activeDraggableGroup, setActiveDraggableGroup] = createSharedSignal(
    "activeDraggableGroup",
    null
  );

  return (
    <div class={clsx(props.parentId && "ml-4 relative")}>
      <Show when={props.parentId}>
        <div
          class={clsx(
            "h-full w-3px -left-[0.5px] left-0 absolute rounded-full",
            storage().dashboardViewAncestor?.id === props.parentId && "bg-gradient-to-tr",
            storage().dashboardViewAncestor?.id !== props.parentId && "bg-gray-200 dark:bg-gray-700"
          )}
        />
      </Show>
      <div>
        <Show
          when={
            props.parentId &&
            props.openedLevels.includes(props.parentId || "") &&
            !props.levels[props.parentId]
          }
        >
          <div class="ml-6 flex flex-col">
            <For each={[0, 1, 2]}>
              {(index) => {
                return (
                  <div
                    class="animate-pulse h-5 w-full flex justify-start items-center gap-1"
                    style={{ "animation-delay": `${index * 500}ms` }}
                  >
                    <div class="bg-black dark:bg-white !bg-opacity-5 h-4 m-0.25 w-4 rounded-lg"></div>
                    <div class="bg-black dark:bg-white !bg-opacity-5 h-3 flex-1 max-w-[10rem] rounded-lg"></div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
        <For each={props.levels[props.parentId || ""]?.groups || []}>
          {(group) => {
            return (
              <div class="relative">
                <ContentGroupRow
                  contentGroup={group}
                  removeContentGroup={props.removeContentGroup}
                  removeContentPiece={props.removeContentPiece}
                  loading={props.openedLevels.includes(group.id || "") && !props.levels[group.id]}
                  opened={props.openedLevels.includes(group.id || "")}
                  active={storage().dashboardViewAncestor?.id === group.id}
                  onClick={() => {
                    setStorage((storage) => ({
                      ...storage,
                      dashboardViewAncestor: group
                    }));
                  }}
                  onExpand={(forceOpen) => {
                    if (props.openedLevels.includes(group.id) && !forceOpen) {
                      props.setOpenedLevels(props.openedLevels.filter((id) => id !== group.id));
                    } else {
                      props.loadLevel(group.id, true);
                      props.setOpenedLevels([...props.openedLevels, group.id]);
                    }
                  }}
                />
                <Show
                  when={
                    props.openedLevels.includes(group.id || "") &&
                    activeDraggableGroup()?.id !== group.id
                  }
                >
                  <LevelTree
                    levels={props.levels}
                    loadLevel={props.loadLevel}
                    openedLevels={props.openedLevels}
                    removeContentGroup={props.removeContentGroup}
                    removeContentPiece={props.removeContentPiece}
                    parentId={group.id}
                    setOpenedLevels={props.setOpenedLevels}
                  />
                </Show>
              </div>
            );
          }}
        </For>
        <For each={props.levels[props.parentId || ""]?.pieces || []}>
          {(piece) => {
            return <ContentPieceRow contentPiece={piece} />;
          }}
        </For>
      </div>
    </div>
  );
};
const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const client = useClient();
  const { storage, setStorage } = useLocalStorage();
  const [contentPiecesLoading, setContentPiecesLoading] = createSignal(false);
  const [removedContentPieces, setRemovedContentPieces] = createSignal<string[]>([]);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const removeContentGroup = (id: string): void => {
    props.setContentGroups(props.contentGroups.filter((contentGroup) => contentGroup.id !== id));
  };
  const removeContentPiece = (id: string): void => {
    setRemovedContentPieces([...removedContentPieces(), id]);
  };
  const [levels, setLevels] = createStore<Record<string, Level>>({});
  const openedLevels = (): string[] => {
    return storage().explorerOpenedLevels || [];
  };
  const setOpenedLevels = (openedLevels: string[]): void => {
    setStorage((storage) => ({
      ...storage,
      explorerOpenedLevels: openedLevels
    }));
  };
  const loadLevel = async (parentId?: string, preload?: boolean): Promise<void> => {
    if (levels[parentId || ""]) return;

    const contentGroups = await client.contentGroups.list.query({
      ancestor: parentId || undefined
    });
    const level: Level = { groups: contentGroups, pieces: [] };

    if (preload) {
      contentGroups.forEach((contentGroup) => {
        loadLevel(contentGroup.id);
      });
    }

    if (parentId) {
      const contentPieces = await client.contentPieces.list.query({ contentGroupId: parentId });

      level.pieces = contentPieces;
    }

    setLevels(parentId || "", level);
  };

  loadLevel("", true);
  openedLevels().forEach((id) => loadLevel(id));
  client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "move") {
        const [currentParentId] = Object.entries(levels).find(([id, level]) => {
          return level.groups.find((group) => group.id === data.id);
        })!;

        setLevels(currentParentId, "groups", (groups) => {
          return groups.filter((group) => group.id !== data.id);
        });
        setLevels(data.ancestors[data.ancestors.length - 1] || "", "groups", (groups) => [
          ...groups,
          data
        ]);
      }
    }
  });

  return (
    <div class="relative overflow-hidden w-full pl-3">
      <div class={"flex justify-start items-start mb-4 pl-2 flex-col pt-5"}>
        <div class="flex justify-center items-center">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                sidePanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1">
            Explorer
          </Heading>
        </div>
      </div>
      <div class="relative overflow-hidden h-[calc(100%-4.5rem)]">
        <ContentGroupsContextProvider
          ancestor={() => props.ancestor}
          setAncestor={props.setAncestor}
        >
          <div
            class="flex flex-col w-full h-full overflow-y-auto scrollbar-sm-contrast pb-5 pr-5"
            ref={setScrollableContainerRef}
          >
            <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
            <div>
              <LevelTree
                removeContentGroup={removeContentGroup}
                removeContentPiece={removeContentPiece}
                loadLevel={loadLevel}
                levels={levels}
                openedLevels={openedLevels()}
                setOpenedLevels={setOpenedLevels}
              />
            </div>
          </div>
        </ContentGroupsContextProvider>
      </div>
    </div>
  );
};

export { DashboardListView };
