import { ContentGroupRow } from "./content-group-row";
import { ContentPieceRow } from "./content-piece-row";
import clsx from "clsx";
import { Component, createEffect, Show, For, Setter } from "solid-js";
import { SetStoreFunction } from "solid-js/store";
import SortableLib from "sortablejs";
import { Button, Icon } from "@vrite/components";
import { mdiDotsHorizontalCircleOutline } from "@mdi/js";
import { App, useLocalStorage, useSharedState } from "#context";

type Level = {
  groups: App.ContentGroup[];
  pieces: Array<App.ExtendedContentPieceWithAdditionalData<"locked" | "order">>;
};

const TreeLevel: Component<{
  parentId?: string;
  levels: Record<string, Level>;
  openedLevels: string[];
  highlight: string;
  contentGroups: Record<string, App.ContentGroup>;
  setHighlight: Setter<string>;
  setContentGroups: SetStoreFunction<Record<string, App.ContentGroup>>;
  setLevels: SetStoreFunction<Record<string, Level>>;
  setOpenedLevels(openedLevels: string[]): void;
  loadLevel(parentId: string, preload?: boolean): void;
}> = (props) => {
  const { storage, setStorage } = useLocalStorage();
  const createSharedSignal = useSharedState();
  const [activeDraggableGroup] = createSharedSignal("activeDraggableGroup", null);
  const [activeDraggablePiece] = createSharedSignal("activeDraggablePiece", null);
  const handleHighlight = (
    event: DragEvent | MouseEvent | TouchEvent,
    group: App.ContentGroup
  ): void => {
    const draggablePiece = activeDraggablePiece();

    let draggableGroup = activeDraggableGroup();

    if (!draggableGroup && draggablePiece) {
      draggableGroup = props.contentGroups[draggablePiece.contentGroupId];
    }

    if (draggableGroup) {
      if (
        group.id !== draggableGroup?.id &&
        (draggablePiece ||
          !props.contentGroups[group.id || ""]?.ancestors.includes(draggableGroup!.id)) &&
        (draggablePiece || draggableGroup?.ancestors.at(-1) !== group.id)
      ) {
        props.setHighlight(group.id || "");
      } else {
        props.setHighlight("");
      }
    } else {
      props.setHighlight((highlight) => (highlight === group.id ? "" : highlight));
    }

    event.stopPropagation();
  };
  const selected = (): boolean => storage().dashboardViewAncestor?.id === props.parentId;

  createEffect(() => {
    if (!activeDraggableGroup() && !activeDraggablePiece()) {
      props.setHighlight("");
    }
  });

  return (
    <div class={clsx(props.parentId && "ml-4 relative")}>
      <div
        class={clsx(
          "h-full w-full absolute -z-1",
          props.highlight === props.parentId && "bg-gradient-to-tr opacity-30"
        )}
      />
      <Show when={props.parentId}>
        <div
          class={clsx(
            "h-full w-0.5 -left-[0.5px] left-0 absolute rounded-full bg-black bg-opacity-5 dark:bg-white dark:bg-opacity-10",
            ((selected() && !activeDraggableGroup() && !activeDraggablePiece()) ||
              props.highlight === props.parentId) &&
              "!bg-gradient-to-tr"
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
          <div class="ml-2 flex flex-col">
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
              <div
                class="relative"
                data-content-group-id={group?.id || ""}
                onDragEnter={(event) => {
                  handleHighlight(event, group);
                }}
                onDragLeave={(event) => {
                  if (
                    event.relatedTarget instanceof HTMLElement &&
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    props.setHighlight((highlight) => (highlight === group.id ? "" : highlight));
                  }
                }}
                onTouchMove={(event) => {
                  const x = event.touches[0].clientX;
                  const y = event.touches[0].clientY;
                  const elementAtTouchPoint = document.elementFromPoint(x, y);
                  const closestLevel = elementAtTouchPoint?.closest(
                    "[data-content-group-id]"
                  ) as HTMLElement | null;

                  if (closestLevel) {
                    const contentGroup = props.contentGroups[closestLevel.dataset.contentGroupId!];

                    if (contentGroup) {
                      handleHighlight(event, contentGroup);
                    }
                  }
                }}
                onPointerLeave={(event) => {
                  if (activeDraggableGroup()) {
                    props.setHighlight((highlight) => (highlight === group.id ? "" : highlight));
                  }
                }}
                ref={(el) => {
                  SortableLib.create(el, {
                    group: {
                      name: "shared"
                    },
                    disabled: true
                  });
                }}
              >
                <ContentGroupRow
                  contentGroup={group}
                  removeContentGroup={() => {}}
                  removeContentPiece={() => {}}
                  loading={props.openedLevels.includes(group.id || "") && !props.levels[group.id]}
                  opened={props.openedLevels.includes(group.id || "")}
                  active={storage().dashboardViewAncestor?.id === group.id}
                  highlight={props.highlight === group.id}
                  onDragEnd={() => {
                    const newParentId = props.highlight || "";
                    const oldParentId = group.ancestors.at(-1) || "";
                    const newParent = props.contentGroups[newParentId];
                    const oldParent = props.contentGroups[oldParentId];

                    if (newParentId === oldParentId || !newParent || !oldParent) return;

                    if (props.levels[oldParentId]) {
                      props.setLevels(oldParentId, "groups", (groups) => {
                        return groups.filter((filteredGroup) => filteredGroup.id !== group.id);
                      });
                    }

                    if (props.levels[newParentId]) {
                      props.setLevels(newParentId, "groups", (groups) => [
                        ...groups,
                        {
                          ...group,
                          ancestors: [...newParent.ancestors, newParentId]
                        }
                      ]);
                    }

                    props.setContentGroups(group.id, {
                      ...group,
                      ancestors: [...newParent.ancestors, newParentId]
                    });
                    props.setContentGroups(oldParentId, {
                      ...oldParent,
                      descendants: oldParent.descendants.filter((id) => id !== group.id)
                    });
                    props.setContentGroups(newParentId, {
                      ...newParent,
                      descendants: [...newParent.descendants, group.id]
                    });
                  }}
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
                <Show when={props.openedLevels.includes(group.id || "")}>
                  <TreeLevel
                    levels={props.levels}
                    loadLevel={props.loadLevel}
                    openedLevels={props.openedLevels}
                    parentId={group.id}
                    setOpenedLevels={props.setOpenedLevels}
                    highlight={props.highlight}
                    setHighlight={props.setHighlight}
                    setContentGroups={props.setContentGroups}
                    contentGroups={props.contentGroups}
                    setLevels={props.setLevels}
                  />
                </Show>
              </div>
            );
          }}
        </For>
        <For each={props.levels[props.parentId || ""]?.pieces || []}>
          {(piece) => {
            return (
              <ContentPieceRow
                contentPiece={piece}
                onDragEnd={() => {
                  const newParentId = props.highlight || "";
                  const oldParentId = piece.contentGroupId;
                  const newParent = props.contentGroups[newParentId];
                  const oldParent = props.contentGroups[oldParentId];

                  if (newParentId === oldParentId || !newParent || !oldParent) return;

                  if (props.levels[oldParentId]) {
                    props.setLevels(oldParentId, "pieces", (pieces) => {
                      return pieces.filter((filteredPiece) => filteredPiece.id !== piece.id);
                    });
                  }

                  if (props.levels[newParentId]) {
                    props.setLevels(newParentId, "pieces", (pieces) => [
                      ...pieces,
                      {
                        ...piece,
                        contentGroupId: newParentId
                      }
                    ]);
                  }
                }}
              />
            );
          }}
        </For>
        <Button
          class="!hidden w-[calc(100%-0.125rem)] m-0 flex pl-6 p-0 ml-0.5 justify-start items-center gap-1 rounded-none hover:bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent"
          hover={false}
          variant="text"
        >
          <div class="h-8 w-8 p-1">
            <Icon path={mdiDotsHorizontalCircleOutline} class="h-6 w-6 fill-[url(#gradient)]" />
          </div>
          Load more
        </Button>
      </div>
    </div>
  );
};

export { TreeLevel };
export type { Level };
