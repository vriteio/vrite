import { ContentPieceRow } from "./content-piece-row";
import { useDashboardTableViewData } from "./table-view-context";
import { useDashboardData } from "../dashboard-context";
import {
  mdiChevronDown,
  mdiDotsHorizontal,
  mdiDotsHorizontalCircleOutline,
  mdiFileDocumentOutline,
  mdiFileDocumentPlusOutline,
  mdiFolderPlus,
  mdiIdentifier,
  mdiPlus,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import {
  IconButton,
  Dropdown,
  Button,
  Heading,
  Sortable,
  Icon,
  Loader
} from "#components/primitives";
import {
  App,
  useClient,
  hasPermission,
  useNotifications,
  useConfirmationModal,
  useContentData,
  ContentLevel,
  useCommandPalette,
  useLocalStorage
} from "#context";
import { MiniEditor } from "#components/fragments";

interface ContentPieceGroupProps {
  contentGroup: App.ContentGroup;
  dataProps: Record<string, string>;
  index: number;
  remove?(id?: string): void;
}
interface AddContentPieceGroupProps {
  class?: string;
}

const AddContentPieceGroup: Component<AddContentPieceGroupProps> = (props) => {
  const [loading, setLoading] = createSignal(false);
  const client = useClient();
  const { notify } = useNotifications();
  const { activeContentGroupId } = useContentData();
  const { registerCommand } = useCommandPalette();
  const createNewContentGroup = async (): Promise<void> => {
    try {
      setLoading(true);
      await client.contentGroups.create.mutate({
        name: "",
        ancestor: activeContentGroupId() || undefined
      });
      setLoading(false);
      notify({ text: "New content group created", type: "success" });
    } catch (error) {
      setLoading(false);
      notify({ text: "Couldn't create new content group", type: "error" });
    }
  };

  registerCommand({
    action: createNewContentGroup,
    category: "dashboard",
    icon: mdiFolderPlus,
    name: "New content group"
  });

  return (
    <button
      class={clsx(
        "h-12 w-full flex justify-start items-center gap-3 group px-2 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer",
        props.class
      )}
      onClick={createNewContentGroup}
      disabled={loading()}
    >
      <IconButton
        badge
        hover={false}
        path={mdiPlus}
        class="m-0"
        variant="text"
        loading={loading()}
      />
      <Heading level={3}>Add content group</Heading>
    </button>
  );
};
const ContentPieceGroup: Component<ContentPieceGroupProps> = (props) => {
  const { contentPieces, contentLevels, contentLoader, contentActions } = useContentData();
  const {
    activeDraggableContentGroupId,
    activeDraggableContentPieceId,
    setActiveDraggableContentPieceId
  } = useDashboardData();
  const { setStorage } = useLocalStorage();
  const { notify } = useNotifications();
  const { confirmDelete } = useConfirmationModal();
  const { tableWidth, container } = useDashboardTableViewData();
  const [expanded, setExpanded] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const navigate = useNavigate();
  const client = useClient();
  const columnContentLevel = (): ContentLevel => {
    return (
      contentLevels[props.contentGroup.id || ""] || {
        groups: [],
        moreToLoad: false,
        pieces: [],
        loading: false
      }
    );
  };
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    } | null> = [
      {
        icon: mdiIdentifier,
        label: "Copy ID",
        async onClick() {
          if (!props.contentGroup) return;

          await window.navigator.clipboard.writeText(props.contentGroup.id);
          setDropdownOpened(false);
          notify({
            text: "Content group ID copied to the clipboard",
            type: "success"
          });
        }
      }
    ];

    if (hasPermission("manageDashboard")) {
      menuOptions.push(
        {
          icon: mdiFileDocumentPlusOutline,
          label: "New content piece",

          async onClick() {
            try {
              const newContentPieceData = {
                contentGroupId: props.contentGroup.id,
                referenceId: columnContentLevel().pieces[0],
                tags: [],
                members: [],
                title: ""
              };

              setDropdownOpened(false);
              setLoading(true);

              const { id } = await client.contentPieces.create.mutate(newContentPieceData);

              setLoading(false);
              notify({ text: "New content piece created", type: "success" });
              setStorage((storage) => ({
                ...storage,
                sidePanelView: "contentPiece",
                sidePanelWidth: storage.sidePanelWidth || 375
              }));
              navigate(`/${id}`);
            } catch (error) {
              notify({ text: "Couldn't create the content piece", type: "error" });
              setLoading(false);
            }
          }
        },
        {
          icon: mdiTrashCan,
          label: "Delete",

          color: "danger",
          onClick() {
            setDropdownOpened(false);
            confirmDelete({
              header: "Delete group",
              content: (
                <p>
                  Do you really want to delete this content group? This will also delete all pieces
                  related to this group.
                </p>
              ),
              async onConfirm() {
                if (!props.contentGroup) return;

                try {
                  setLoading(true);
                  await client.contentGroups.delete.mutate({ id: props.contentGroup.id });
                  contentActions.deleteContentGroup({ id: props.contentGroup.id });
                  setLoading(false);
                  notify({ text: "Content group deleted", type: "success" });
                } catch (error) {
                  notify({ text: "Couldn't delete the content group", type: "error" });
                  setLoading(false);
                }
              }
            });
          }
        }
      );
    }

    return menuOptions;
  });
  const maxHeight = (): string => {
    if (expanded() && !activeDraggableContentGroupId()) {
      return `${Math.max(columnContentLevel().pieces.length * 34, 34)}px`;
    }

    return activeDraggableContentPieceId() ? "unset" : "0px";
  };

  contentLoader.loadContentLevel(props.contentGroup.id, { loadMore: false });

  return (
    <div
      class="flex flex-col"
      data-content-group-id={props.contentGroup.id}
      {...(props.dataProps || {})}
    >
      <div class="flex flex-col overflow-hidden" style={{ "min-width": `${tableWidth()}px` }}>
        <div class="border-b-2 text-left font-500 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-full h-12 relative">
          <div class="h-12 flex justify-start items-center gap-3 group px-2 border-b-2 border-transparent">
            <IconButton
              path={mdiChevronDown}
              class={clsx("m-0", expanded() && "transform rotate-180")}
              variant="text"
              onClick={() => {
                setExpanded(!expanded());
              }}
            />
            <div>
              <MiniEditor
                class="inline-flex overflow-x-auto font-semibold content-group-name scrollbar-hidden hover:cursor-text whitespace-nowrap-children"
                content="paragraph"
                initialValue={props.contentGroup.name}
                readOnly={Boolean(
                  activeDraggableContentGroupId() || !hasPermission("manageDashboard")
                )}
                placeholder="Group name"
                onBlur={(editor) => {
                  client.contentGroups.update.mutate({
                    id: props.contentGroup.id,
                    name: editor.getText()
                  });
                  contentActions.updateContentGroup({
                    id: props.contentGroup.id,
                    name: editor.getText()
                  });
                }}
              />
            </div>
            <Dropdown
              placement="bottom-start"
              alternativePlacements={["bottom-start", "top-start"]}
              boundary={container()}
              opened={dropdownOpened()}
              fixed
              class="ml-1 mr-4"
              cardProps={{ class: "min-h-29" }}
              setOpened={setDropdownOpened}
              activatorButton={() => (
                <IconButton
                  path={mdiDotsHorizontal}
                  class={clsx("m-0 opacity-0 group-hover:opacity-100", loading() && "!opacity-100")}
                  loading={loading()}
                  variant="text"
                  text="soft"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDropdownOpened(true);
                  }}
                />
              )}
            >
              <div class="w-full flex flex-col">
                <For each={menuOptions()}>
                  {(item) => {
                    if (!item) {
                      return (
                        <div class="hidden md:block w-full h-2px my-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      );
                    }

                    return (
                      <IconButton
                        path={item.icon}
                        label={item.label}
                        variant="text"
                        text="soft"
                        color={item.color}
                        class="justify-start whitespace-nowrap w-full m-0"
                        onClick={item.onClick}
                      />
                    );
                  }}
                </For>
              </div>
            </Dropdown>
          </div>
        </div>
        <Sortable
          class="flex flex-col items-start overflow-hidden transition-all transform duration-300 ease-in-out"
          fallback={
            <Show when={!activeDraggableContentPieceId() && !columnContentLevel().loading}>
              <div class="locked border-b-2 border-gray-200 dark:border-gray-700 text-center w-full h-8 flex justify-start px-3 items-center text-gray-500 dark:text-gray-400 text-sm">
                No content pieces
              </div>
            </Show>
          }
          style={{
            "max-height": maxHeight()
          }}
          ids={columnContentLevel().pieces}
          filter=".locked"
          ghostClass=":base: border-b-2 border-gray-200 dark:border-gray-700 children:invisible"
          group="table-row"
          disabled={!hasPermission("manageDashboard")}
          sortableId={props.contentGroup.id}
          dragImage={(props) => {
            return (
              <div class="flex whitespace-nowrap gap-1 rounded-lg px-1 py-0.5 border-2 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700">
                <Icon path={mdiFileDocumentOutline} class="h-6 w-6" />
                {contentPieces[props.id]?.title}
              </div>
            );
          }}
          onDragStart={(affectedId) => {
            if (affectedId) {
              setActiveDraggableContentPieceId(affectedId);
            }
          }}
          onDragEnd={(newIds, details) => {
            const isMoved =
              columnContentLevel().pieces.some((id) => !newIds.includes(id)) ||
              newIds.some((id) => !columnContentLevel().pieces.includes(id));
            const isReordered =
              !isMoved && columnContentLevel().pieces.join(":") !== newIds.join(":");

            setActiveDraggableContentPieceId(null);

            if (isReordered) {
              const oldIndex = columnContentLevel().pieces.indexOf(details.affectedId);
              const newIndex = newIds.indexOf(details.affectedId);
              const contentPieceId = columnContentLevel().pieces[oldIndex];
              const baseReferenceContentPieceId = columnContentLevel().pieces[newIndex];
              const secondReferenceContentPieceId =
                columnContentLevel().pieces[oldIndex < newIndex ? newIndex + 1 : newIndex - 1];

              let nextReferenceContentPieceId = secondReferenceContentPieceId;
              let previousReferenceContentPieceId = baseReferenceContentPieceId;

              if (oldIndex < newIndex) {
                nextReferenceContentPieceId = baseReferenceContentPieceId;
                previousReferenceContentPieceId = secondReferenceContentPieceId;
              }

              client.contentPieces.move.mutate({
                id: contentPieceId,
                nextReferenceId: nextReferenceContentPieceId,
                previousReferenceId: previousReferenceContentPieceId
              });

              if (contentPieces[contentPieceId]) {
                contentActions.moveContentPiece({
                  contentPiece: {
                    ...contentPieces[contentPieceId]!,
                    contentGroupId: props.contentGroup.id
                  },
                  nextReferenceId: nextReferenceContentPieceId,
                  previousReferenceId: previousReferenceContentPieceId
                });
              }
            }

            if (isMoved && details.movedInSortableId && details.movedInIds) {
              const movedInIdsWithoutAffectedId = details.movedInIds.filter(
                (id) => id !== details.affectedId
              );
              const newIndex = details.movedInIds.indexOf(details.affectedId);
              const nextReferenceId = movedInIdsWithoutAffectedId[newIndex - 1];
              const previousReferenceId = movedInIdsWithoutAffectedId[newIndex];

              client.contentPieces.move.mutate({
                id: details.affectedId,
                contentGroupId: details.movedInSortableId,
                nextReferenceId,
                previousReferenceId
              });
              contentActions.moveContentPiece({
                contentPiece: {
                  ...contentPieces[details.affectedId]!,
                  contentGroupId: details.movedInSortableId
                },
                nextReferenceId,
                previousReferenceId
              });
            }
          }}
        >
          {(contentPieceId, index, dataProps) => {
            const contentPiece = (): App.ExtendedContentPieceWithAdditionalData<
              "coverWidth" | "order"
            > | null => {
              return contentPieces[contentPieceId] || null;
            };

            return (
              <Show when={contentPiece()}>
                <ContentPieceRow
                  contentPiece={contentPiece()!}
                  dataProps={dataProps()}
                  index={index()}
                />
              </Show>
            );
          }}
        </Sortable>
      </div>
      <Show when={(columnContentLevel().moreToLoad || columnContentLevel().loading) && expanded()}>
        <Button
          class="border-b-2 border-r-2 bg-gray-50 rounded-none border-gray-200 dark:border-gray-700 m-0 w-full z-1 flex justify-start items-center"
          onClick={() => {
            contentLoader.loadContentLevel(props.contentGroup.id);
          }}
        >
          <div class="mr-1 h-6 w-6 flex justify-center items-center">
            <Show
              when={!columnContentLevel().loading}
              fallback={<Loader class="h-4 w-4" color="primary" />}
            >
              <Icon path={mdiDotsHorizontalCircleOutline} class="h-6 w-6 fill-[url(#gradient)]" />
            </Show>
          </div>
          {columnContentLevel().loading ? "Loading..." : "Load more"}
        </Button>
      </Show>
    </div>
  );
};

export { ContentPieceGroup, AddContentPieceGroup };
