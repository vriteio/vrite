import { TreeLevel } from "./tree-level";
import { Level, useExplorerData } from "./explorer-context";
import { Component, createSignal } from "solid-js";
import { mdiClose, mdiHexagonSlice6 } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { Heading, IconButton } from "#components/primitives";
import { App, useAuthenticatedUserData, useClient, useLocalStorage } from "#context";
import { ScrollShadow } from "#components/fragments";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
}

const [highlight, setHighlight] = createSignal("");
const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const { levels, contentGroups, contentPieces, setContentGroups, setContentPieces, setLevels } =
    useExplorerData();
  const client = useClient();
  const { storage, setStorage } = useLocalStorage();
  const { workspace } = useAuthenticatedUserData();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const openedLevels = (): string[] => {
    return storage().explorerOpenedLevels || [];
  };
  const openLevel = (parentId: string): void => {
    setStorage((storage) => ({
      ...storage,
      explorerOpenedLevels: [...new Set([...openedLevels(), parentId])]
    }));
  };
  const closeLevel = (parentId: string): void => {
    const levelsToClose = [parentId];
    const addLevelsToClose = (parentId: string): void => {
      const level = levels[parentId];

      if (!level) {
        return;
      }

      levelsToClose.push(...level.groups);
      level.groups.forEach((groupId) => addLevelsToClose(groupId));
    };

    addLevelsToClose(parentId);
    setStorage((storage) => ({
      ...storage,
      explorerOpenedLevels:
        storage.explorerOpenedLevels?.filter((id) => !levelsToClose.includes(id)) || []
    }));
  };
  const loadLevel = async (parentId?: string, preload?: boolean): Promise<void> => {
    const existingLevel = levels[parentId || ""];

    if (existingLevel && existingLevel.moreToLoad) {
      if (parentId) {
        const level = {
          groups: [...existingLevel.groups],
          pieces: [...existingLevel.pieces],
          moreToLoad: false
        };
        const lastPieceId = existingLevel.pieces.at(-1);
        const lastPiece = contentPieces[lastPieceId || ""];

        if (!lastPiece) {
          setLevels(parentId, level);

          return;
        }

        const newContentPieces = await client.contentPieces.list.query({
          contentGroupId: parentId,
          lastOrder: lastPiece.order
        });

        level.pieces.push(...newContentPieces.map((contentPiece) => contentPiece.id));
        newContentPieces.forEach((contentPiece) => {
          setContentPieces(contentPiece.id, contentPiece);
        });

        if (newContentPieces.length === 20) {
          level.moreToLoad = true;
        }

        setLevels(parentId, level);
      }

      return;
    }

    const contentGroups = await client.contentGroups.list.query({
      ancestor: parentId || undefined
    });
    const level: Level = {
      groups: contentGroups.map((contentGroup) => contentGroup.id),
      pieces: [],
      moreToLoad: false
    };

    contentGroups.forEach((contentGroup) => {
      if (preload) {
        loadLevel(contentGroup.id);
      }

      setContentGroups(contentGroup.id, contentGroup);
    });

    if (parentId) {
      const contentPieces = await client.contentPieces.list.query({
        contentGroupId: parentId
      });

      level.pieces = contentPieces.map((contentPiece) => contentPiece.id);
      contentPieces.forEach((contentPiece) => {
        setContentPieces(contentPiece.id, contentPiece);
      });

      if (contentPieces.length === 20) {
        level.moreToLoad = true;
      }
    }

    setLevels(parentId || "", level);
  };

  loadLevel("", true);
  openedLevels().forEach((id) => loadLevel(id));
  client.contentGroups.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "move") {
        const [currentParentId] = Object.entries(levels).find(([, level]) => {
          return level?.groups.find((groupId) => groupId === data.id);
        })!;

        setLevels(currentParentId, "groups", (groups) => {
          return groups.filter((groupId) => groupId !== data.id);
        });
        setLevels(data.ancestors[data.ancestors.length - 1] || "", "groups", (groups) => [
          ...groups,
          data.id
        ]);
      } else if (action === "create") {
        setContentGroups(data.id, data);
        // eslint-disable-next-line sonarjs/no-identical-functions
        setLevels(data.ancestors[data.ancestors.length - 1] || "", "groups", (groups) => [
          ...groups,
          data.id
        ]);
      } else if (action === "delete") {
        const parentId = contentGroups[data.id]?.ancestors.at(-1);

        setContentGroups(data.id, undefined);
        setLevels(parentId || "", "groups", (groups) => {
          return groups.filter((groupId) => groupId !== data.id);
        });
      } else if (action === "update") {
        const parentId = contentGroups[data.id]?.ancestors.at(-1);

        setContentGroups(data.id, data);
        // update
      } else if (action === "reorder") {
        // reorder
      }
    }
  });

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
                sidePanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1 flex-1">
            Explorer
          </Heading>
        </div>
        <IconButton
          class="m-0 py-0 !font-normal"
          path={mdiHexagonSlice6}
          variant="text"
          text="soft"
          color={storage().dashboardViewAncestor ? "base" : "primary"}
          size="small"
          onClick={() => {
            setStorage((storage) => ({
              ...storage,
              dashboardViewAncestor: undefined
            }));
          }}
          label={<span class="flex-1 clamp-1 ml-1">{workspace()?.name}</span>}
        />
      </div>
      <div class="relative overflow-hidden flex-1">
        <div
          class="flex flex-col w-full h-full overflow-y-auto scrollbar-sm-contrast pb-5"
          ref={setScrollableContainerRef}
        >
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <div>
            <TreeLevel
              loadLevel={loadLevel}
              openedLevels={openedLevels()}
              openLevel={openLevel}
              closeLevel={closeLevel}
              highlight={highlight()}
              setHighlight={setHighlight}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { DashboardListView };
