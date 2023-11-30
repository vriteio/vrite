import { Level, TreeLevel } from "./tree-level";
import { Component, createSignal } from "solid-js";
import { mdiClose } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { createStore } from "solid-js/store";
import { Heading, IconButton } from "#components/primitives";
import { App, useClient, useLocalStorage } from "#context";
import { ScrollShadow } from "#components/fragments";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
}

const [highlight, setHighlight] = createSignal("");
const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const client = useClient();
  const { storage, setStorage } = useLocalStorage();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [levels, setLevels] = createStore<Record<string, Level>>({});
  const [contentGroups, setContentGroups] = createStore<Record<string, App.ContentGroup>>({});
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

    contentGroups.forEach((contentGroup) => {
      if (preload) {
        loadLevel(contentGroup.id);
      }

      setContentGroups(contentGroup.id, contentGroup);
    });

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
        <div
          class="flex flex-col w-full h-full overflow-y-auto scrollbar-sm-contrast pb-5"
          ref={setScrollableContainerRef}
        >
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <div>
            <TreeLevel
              loadLevel={loadLevel}
              levels={levels}
              openedLevels={openedLevels()}
              contentGroups={contentGroups}
              setOpenedLevels={setOpenedLevels}
              highlight={highlight()}
              setHighlight={setHighlight}
              setContentGroups={setContentGroups}
              setLevels={setLevels}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { DashboardListView };
