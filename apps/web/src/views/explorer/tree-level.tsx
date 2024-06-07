import { ContentGroupRow } from "./content-group-row";
import { ContentPieceRow } from "./content-piece-row";
import { useExplorerData } from "./explorer-context";
import clsx from "clsx";
import { Component, createEffect, Show, For, createSignal } from "solid-js";
import SortableLib from "sortablejs";
import {
  mdiChevronRight,
  mdiDotsHorizontalCircleOutline,
  mdiFolderPlus,
  mdiUnfoldMoreHorizontal
} from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import { Icon, IconButton, Loader, Sortable } from "#components/primitives";
import { App, hasPermission, useClient, useContentData, useNotifications } from "#context";

const NewGroupButton: Component = () => {
  const { setRenaming } = useExplorerData();
  const { notify } = useNotifications();
  const client = useClient();
  const [loading, setLoading] = createSignal(false);

  return (
    <button
      class="flex w-full justify-center items-center cursor-pointer overflow-x-hidden group pl-0.5 rounded-l-md @hover:bg-gray-200 dark:@hover-bg-gray-700"
      onClick={async () => {
        try {
          setLoading(true);

          const contentGroup = await client.contentGroups.create.mutate({
            name: ""
          });

          setRenaming(contentGroup.id);
          setLoading(false);
          notify({ text: "New content group created", type: "success" });
        } catch (error) {
          setLoading(false);
          notify({ text: "Couldn't create new content group", type: "error" });
        }
      }}
    >
      <div class="flex flex-1 justify-start items-center overflow-hidden rounded-lg cursor-pointer h-7 group draggable">
        <IconButton
          class={clsx("transform transition m-0 p-0 mx-0.25")}
          path={mdiChevronRight}
          variant="text"
          hover={false}
          badge
        />
        <div class="flex flex-1" onClick={() => {}}>
          <div class="h-6 w-6 mr-1">
            <Show
              when={loading()}
              fallback={
                <Icon class={clsx("text-gray-500 dark:text-gray-400")} path={mdiFolderPlus} />
              }
            >
              <Loader class="h-full fill-current p-0.5" />
            </Show>
          </div>
          <span
            class={clsx(
              "!text-base inline-flex text-start flex-1 overflow-x-auto content-group-name scrollbar-hidden select-none clamp-1"
            )}
            title="New group"
          >
            New group
          </span>
        </div>
      </div>
    </button>
  );
};
const TreeLevel: Component<{
  parentId?: string;
}> = (props) => {
  const {
    contentPieces,
    contentGroups,
    contentLevels,
    expandedContentLevels,
    expandContentLevel,
    collapseContentLevel,
    activeContentGroupId,
    activeContentPieceId,
    setActiveContentGroupId,
    contentLoader,
    contentActions
  } = useContentData();
  const {
    highlight,
    setHighlight,
    activeDraggableContentGroupId,
    activeDraggableContentPieceId,
    pathnameData
  } = useExplorerData();
  const client = useClient();
  const navigate = useNavigate();
  const handleHighlight = (event: DragEvent | MouseEvent | TouchEvent, groupId: string): void => {
    const draggablePieceId = activeDraggableContentPieceId();
    const draggableGroupId = activeDraggableContentGroupId();

    let group = contentGroups[draggableGroupId || ""];

    if (!draggableGroupId && draggablePieceId) {
      const draggablePiece = contentPieces[draggablePieceId];

      if (!draggablePiece) return;

      group = contentGroups[draggablePiece.contentGroupId];
    }

    if (group) {
      if (
        groupId !== group.id &&
        (draggablePieceId || !contentGroups[groupId || ""]?.ancestors.includes(group.id)) &&
        (draggablePieceId || (group?.ancestors.at(-1) || "") !== groupId)
      ) {
        setHighlight(groupId || null);
      } else {
        setHighlight(null);
      }
    } else {
      setHighlight((highlight) => (highlight === groupId ? "" : highlight));
    }

    event.stopPropagation();
  };
  const selected = (): boolean => activeContentGroupId() === props.parentId;

  createEffect(() => {
    if (!activeDraggableContentGroupId() && !activeDraggableContentPieceId()) {
      setHighlight(null);
    }
  });

  return (
    <div class={clsx(props.parentId && "ml-3.5 relative")}>
      <div
        class={clsx(
          "h-full w-full absolute -z-1",
          highlight() === props.parentId && "bg-gradient-to-tr opacity-30"
        )}
      />
      <Show when={props.parentId}>
        <div
          class={clsx(
            "h-full w-0.5 left-0 absolute rounded-full bg-black bg-opacity-5 dark:bg-white dark:bg-opacity-10",
            ((selected() &&
              !activeDraggableContentGroupId() &&
              !activeDraggableContentPieceId() &&
              pathnameData().view === "dashboard") ||
              highlight() === props.parentId) &&
              "!bg-gradient-to-tr"
          )}
        />
      </Show>
      <div>
        <Show
          when={
            !contentLevels[props.parentId || ""] ||
            (!contentLevels[props.parentId || ""]?.groups.length &&
              contentLevels[props.parentId || ""]?.loading)
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
        <For
          each={contentLevels[props.parentId || ""]?.groups || []}
          fallback={
            <Show
              when={
                hasPermission("editContent") &&
                !props.parentId &&
                !contentLevels[props.parentId || ""]?.loading
              }
            >
              <NewGroupButton />
            </Show>
          }
        >
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
                    setHighlight((highlight) => (highlight === groupId ? null : highlight));
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
                  if (activeDraggableContentGroupId()) {
                    setHighlight((highlight) => (highlight === groupId ? null : highlight));
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
                  loading={
                    expandedContentLevels().includes(groupId || "") && !contentLevels[groupId]
                  }
                  opened={expandedContentLevels().includes(groupId || "")}
                  onDragEnd={() => {
                    const group = contentGroups[groupId]!;
                    const newParentId = highlight();
                    const oldParentId = group.ancestors.at(-1) || "";

                    if (
                      newParentId === null ||
                      newParentId === oldParentId ||
                      newParentId === group.id
                    ) {
                      return;
                    }

                    const newParent = contentGroups[newParentId];

                    if (newParent) {
                      collapseContentLevel(groupId);
                      contentActions.moveContentGroup({
                        ancestors: [...(newParent?.ancestors || []), newParentId || ""],
                        id: group.id
                      });
                    }

                    client.contentGroups.move.mutate({
                      id: group.id,
                      ancestor: newParentId || null
                    });
                  }}
                  onClick={() => {
                    setActiveContentGroupId(groupId);
                    navigate(`/${activeContentPieceId() || ""}`);
                  }}
                  onExpand={(forceOpen) => {
                    if (expandedContentLevels().includes(groupId) && !forceOpen) {
                      collapseContentLevel(groupId);
                    } else {
                      contentLoader.loadContentLevel(groupId, { preload: true, loadMore: false });
                      expandContentLevel(groupId);
                    }
                  }}
                />
                <Show when={expandedContentLevels().includes(groupId || "")}>
                  <TreeLevel parentId={groupId} />
                </Show>
              </div>
            );
          }}
        </For>
        <Sortable
          ids={contentLevels[props.parentId || ""]?.pieces || []}
          onDragStart={() => {
            console.log("drag start");
          }}
          handle=".dot-btn"
        >
          {(contentPieceId, index, dataProps) => {
            return (
              <div
                {...dataProps()}
                class="flex flex-row-reverse group/order relative justify-center items-center"
              >
                <IconButton
                  path={mdiUnfoldMoreHorizontal}
                  variant="text"
                  class="dot-btn m-0 opacity-0 group-hover/order:opacity-100 absolute right-10"
                  size="small"
                />
                <ContentPieceRow
                  contentPiece={contentPieces[contentPieceId]!}
                  onClick={() => {
                    navigate(`/editor/${contentPieceId}`);
                  }}
                  onDragEnd={() => {
                    const contentPiece = contentPieces[contentPieceId]!;
                    const newParentId = highlight() || "";
                    const oldParentId = contentPiece.contentGroupId;
                    const updatedContentPiece: App.ExtendedContentPieceWithAdditionalData<
                      "order" | "coverWidth"
                    > = {
                      ...contentPiece,
                      contentGroupId: newParentId
                    };

                    if (!newParentId || newParentId === oldParentId) return;

                    contentActions.moveContentPiece({
                      contentPiece: updatedContentPiece
                    });
                    client.contentPieces.move.mutate({
                      id: contentPieceId,
                      contentGroupId: newParentId || undefined
                    });
                  }}
                />
              </div>
            );
          }}
        </Sortable>
        <Show when={contentLevels[props.parentId || ""]?.moreToLoad}>
          <div class="ml-0.5 flex rounded-none hover:bg-gray-200 dark:hover:bg-gray-700 py-1">
            <button
              class="flex"
              onClick={() => {
                contentLoader.loadContentLevel(props.parentId || "");
              }}
            >
              <div class="ml-6.5 mr-1 h-6 w-6 flex justify-center items-center">
                <Show
                  when={!contentLevels[props.parentId || ""]?.loading}
                  fallback={<Loader class="h-4 w-4" color="primary" />}
                >
                  <Icon
                    path={mdiDotsHorizontalCircleOutline}
                    class="h-6 w-6 fill-[url(#gradient)]"
                  />
                </Show>
              </div>
              {contentLevels[props.parentId || ""]?.loading ? "Loading..." : "Load more"}
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
};

export { TreeLevel };
