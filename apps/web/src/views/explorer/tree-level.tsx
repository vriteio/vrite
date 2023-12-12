import { ContentGroupRow } from "./content-group-row";
import { ContentPieceRow } from "./content-piece-row";
import { useExplorerData } from "./explorer-context";
import clsx from "clsx";
import { Component, createEffect, Show, For, Setter, onCleanup, createSignal } from "solid-js";
import SortableLib from "sortablejs";
import { Button, Icon, Loader } from "@vrite/components";
import { mdiDotsHorizontalCircleOutline } from "@mdi/js";
import { useLocation, useNavigate } from "@solidjs/router";
import { useClient, useLocalStorage, useSharedState } from "#context";

const TreeLevel: Component<{
  parentId?: string;
  openedLevels: string[];
  highlight: string;
  setHighlight: Setter<string>;
  openLevel(parentId: string): void;
  closeLevel(parentId: string): void;
  loadLevel(parentId: string, preload?: boolean): Promise<void>;
}> = (props) => {
  const { contentPieces, contentGroups, levels, setContentPieces, setContentGroups, setLevels } =
    useExplorerData();
  const { storage, setStorage } = useLocalStorage();
  const createSharedSignal = useSharedState();
  const client = useClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeDraggableGroup] = createSharedSignal("activeDraggableGroup", null);
  const [activeDraggablePiece] = createSharedSignal("activeDraggablePiece", null);
  const [loadingMore, setLoadingMore] = createSignal(false);
  const handleHighlight = (event: DragEvent | MouseEvent | TouchEvent, groupId: string): void => {
    const draggablePiece = activeDraggablePiece();

    let draggableGroup = activeDraggableGroup();

    if (!draggableGroup && draggablePiece) {
      draggableGroup = contentGroups[draggablePiece.contentGroupId];
    }

    if (draggableGroup) {
      if (
        groupId !== draggableGroup?.id &&
        (draggablePiece || !contentGroups[groupId || ""]?.ancestors.includes(draggableGroup!.id)) &&
        (draggablePiece || draggableGroup?.ancestors.at(-1) !== groupId)
      ) {
        props.setHighlight(groupId || "");
      } else {
        props.setHighlight("");
      }
    } else {
      props.setHighlight((highlight) => (highlight === groupId ? "" : highlight));
    }

    event.stopPropagation();
  };
  const selected = (): boolean => storage().dashboardViewAncestor?.id === props.parentId;

  if (props.parentId) {
    const contentPiecesSubscription = client.contentPieces.changes.subscribe(
      { contentGroupId: props.parentId },
      {
        onData({ action, data }) {
          if (action === "update") {
            setContentPieces(data.id, data);
          } else if (action === "create") {
            setContentPieces(data.id, data);
            setLevels(props.parentId || "", "pieces", (pieces) => [data.id, ...pieces]);
          } else if (action === "delete") {
            setContentPieces(data.id, undefined);
            setLevels(props.parentId || "", "pieces", (pieces) => {
              return pieces.filter((pieceId) => pieceId !== data.id);
            });
          } else if (action === "move") {
            setContentPieces(data.contentPiece.id, data.contentPiece);

            if (data.contentPiece.contentGroupId === props.parentId) {
              if (data.nextReferenceId) {
                setLevels(props.parentId || "", "pieces", (pieces) => {
                  const newPieces = [
                    ...pieces.filter((pieceId) => pieceId !== data.contentPiece.id)
                  ];
                  const index = newPieces.indexOf(data.nextReferenceId!);

                  if (index < 0) return pieces;

                  newPieces.splice(index + 1, 0, data.contentPiece.id);

                  return newPieces;
                });
              } else if (data.previousReferenceId) {
                setLevels(props.parentId || "", "pieces", (pieces) => {
                  const newPieces = [
                    ...pieces.filter((pieceId) => pieceId !== data.contentPiece.id)
                  ];
                  const index = newPieces.indexOf(data.previousReferenceId!);

                  if (index < 0) return pieces;

                  newPieces.splice(index, 0, data.contentPiece.id);

                  return newPieces;
                });
              } else {
                setLevels(props.parentId || "", "pieces", (pieces) => {
                  return [data.contentPiece.id, ...pieces];
                });
              }
            } else {
              setLevels(props.parentId || "", "pieces", (pieces) => {
                return pieces.filter((pieceId) => pieceId !== data.contentPiece.id);
              });
            }
          }
        }
      }
    );

    onCleanup(() => {
      contentPiecesSubscription.unsubscribe();
    });
  }

  createEffect(() => {
    if (!activeDraggableGroup() && !activeDraggablePiece()) {
      props.setHighlight("");
    }
  });

  return (
    <div class={clsx(props.parentId && "ml-3.5 relative")}>
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
            ((selected() &&
              !activeDraggableGroup() &&
              !activeDraggablePiece() &&
              location.pathname === "/") ||
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
            !levels[props.parentId]
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
        <For each={levels[props.parentId || ""]?.groups || []}>
          {(groupId) => {
            return (
              <div
                class="relative"
                data-content-group-id={groupId || ""}
                onDragEnter={(event) => {
                  handleHighlight(event, groupId);
                }}
                onDragLeave={(event) => {
                  if (
                    event.relatedTarget instanceof HTMLElement &&
                    !event.currentTarget.contains(event.relatedTarget)
                  ) {
                    props.setHighlight((highlight) => (highlight === groupId ? "" : highlight));
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
                    const contentGroup = contentGroups[closestLevel.dataset.contentGroupId!];

                    if (contentGroup) {
                      handleHighlight(event, contentGroup.id);
                    }
                  }
                }}
                onPointerLeave={(event) => {
                  if (activeDraggableGroup()) {
                    props.setHighlight((highlight) => (highlight === groupId ? "" : highlight));
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
                  contentGroup={contentGroups[groupId]!}
                  removeContentGroup={() => {}}
                  removeContentPiece={() => {}}
                  loading={props.openedLevels.includes(groupId || "") && !levels[groupId]}
                  opened={props.openedLevels.includes(groupId || "")}
                  active={storage().dashboardViewAncestor?.id === groupId}
                  highlight={props.highlight === groupId}
                  onDragEnd={() => {
                    const group = contentGroups[groupId]!;
                    const newParentId = props.highlight || "";
                    const oldParentId = group.ancestors.at(-1) || "";
                    const newParent = contentGroups[newParentId];
                    const oldParent = contentGroups[oldParentId];

                    if (newParentId === oldParentId || !newParent || !oldParent) return;

                    if (levels[oldParentId]) {
                      setLevels(oldParentId, "groups", (groupIds) => {
                        return groupIds.filter((filteredGroupId) => filteredGroupId !== group.id);
                      });
                    }

                    setContentGroups(group.id, {
                      ...group,
                      ancestors: [...newParent.ancestors, newParentId]
                    });
                    setContentGroups(oldParentId, {
                      ...oldParent,
                      descendants: oldParent.descendants.filter((id) => id !== group.id)
                    });
                    setContentGroups(newParentId, {
                      ...newParent,
                      descendants: [...newParent.descendants, group.id]
                    });
                    client.contentGroups.move.mutate({
                      id: group.id,
                      ancestor: newParentId || null
                    });
                  }}
                  onClick={() => {
                    navigate("/");
                    setStorage((storage) => ({
                      ...storage,
                      dashboardViewAncestor: contentGroups[groupId]
                    }));
                  }}
                  onExpand={(forceOpen) => {
                    if (props.openedLevels.includes(groupId) && !forceOpen) {
                      props.closeLevel(groupId);
                    } else {
                      props.loadLevel(groupId, true);
                      props.openLevel(groupId);
                    }
                  }}
                />
                <Show when={props.openedLevels.includes(groupId || "")}>
                  <TreeLevel
                    loadLevel={props.loadLevel}
                    openedLevels={props.openedLevels}
                    parentId={groupId}
                    openLevel={props.openLevel}
                    closeLevel={props.closeLevel}
                    highlight={props.highlight}
                    setHighlight={props.setHighlight}
                  />
                </Show>
              </div>
            );
          }}
        </For>
        <For each={levels[props.parentId || ""]?.pieces || []}>
          {(pieceId) => {
            return (
              <ContentPieceRow
                contentPiece={contentPieces[pieceId]!}
                active={storage().contentPieceId === pieceId}
                onClick={() => {
                  navigate("/editor");
                  setStorage((storage) => ({
                    ...storage,
                    contentPieceId: pieceId
                  }));
                }}
                onDragEnd={() => {
                  const piece = contentPieces[pieceId]!;
                  const newParentId = props.highlight || "";
                  const oldParentId = piece.contentGroupId;
                  const newParent = contentGroups[newParentId];
                  const oldParent = contentGroups[oldParentId];

                  if (newParentId === oldParentId || !newParent || !oldParent) return;

                  if (levels[oldParentId]) {
                    setLevels(oldParentId, "pieces", (pieces) => {
                      return pieces.filter((filteredPieceId) => filteredPieceId !== piece.id);
                    });
                  }

                  if (levels[newParentId]) {
                    setLevels(newParentId, "pieces", (pieces) => {
                      return [piece.id, ...pieces];
                    });
                  }

                  if (levels[newParentId]) {
                    setContentPieces(piece.id, (piece) => ({
                      ...piece,
                      contentGroupId: newParentId
                    }));
                  }

                  client.contentPieces.move.mutate({
                    id: piece.id,
                    contentGroupId: newParentId || undefined
                  });
                }}
              />
            );
          }}
        </For>
        <Show when={levels[props.parentId || ""]?.moreToLoad}>
          <div class="ml-0.5 flex rounded-none hover:bg-gray-200 dark:hover:bg-gray-700 py-1">
            <button
              class="flex"
              onClick={async () => {
                setLoadingMore(true);
                await props.loadLevel(props.parentId || "");
                setLoadingMore(false);
              }}
            >
              <div class="ml-6.5 mr-1 h-6 w-6 flex justify-center items-center">
                <Show when={!loadingMore()} fallback={<Loader class="h-4 w-4" color="primary" />}>
                  <Icon
                    path={mdiDotsHorizontalCircleOutline}
                    class="h-6 w-6 fill-[url(#gradient)]"
                  />
                </Show>
              </div>
              {loadingMore() ? "Loading..." : "Load more"}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export { TreeLevel };
