import { ContentPieceRow } from "./content-piece-row";
import { useDashboardListViewData } from "./list-view-context";
import {
  mdiChevronDown,
  mdiDotsHorizontal,
  mdiDotsHorizontalCircleOutline,
  mdiFileDocumentPlusOutline,
  mdiFolder,
  mdiIdentifier,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { createRef } from "#lib/utils";
import {
  IconButton,
  Dropdown,
  Button,
  Heading,
  Sortable,
  Icon,
  Loader
} from "#components/primitives";
import { App, useClient, hasPermission, useNotifications, useConfirmationModal } from "#context";
import { useContentGroupsContext } from "#views/dashboard/content-groups-context";

const ContentPieceList: Component<{
  ancestor: App.ContentGroup;
  removedContentPieces?: string[];
  setContentPiecesLoading(loading: boolean): void;
}> = (props) => {
  const { columns, tableWidth } = useDashboardListViewData();
  const { notify } = useNotifications();
  const [expanded, setExpanded] = createSignal(true);
  const [loadingAction, setLoadingAction] = createSignal("");
  const [renaming, setRenaming] = createSignal("");
  const { confirmDelete } = useConfirmationModal();
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const { activeDraggablePiece, setActiveDraggablePiece, setAncestor } = useContentGroupsContext();
  const [sortableRef, setSortableRef] = createRef<HTMLElement | null>(null);
  const client = useClient();
  // TODO: Use ContentData
  const { contentPieces, loadMore, moreToLoad, loading } = cache(
    `contentPieces:${props.ancestor.id}`,
    () => {
      return useContentPieces(props.ancestor.id);
    }
  );
  const filteredContentPieces = createMemo(() => {
    return contentPieces().filter(
      (contentPiece) => !props.removedContentPieces?.includes(contentPiece.id)
    );
  });
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
          if (!props.ancestor) return;

          await window.navigator.clipboard.writeText(props.ancestor.id);
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
            setLoadingAction(props.ancestor.id);

            try {
              const newContentPiece = await client.contentPieces.create.mutate({
                contentGroupId: props.ancestor.id,
                tags: [],
                members: [],
                title: ""
              });

              setDropdownOpened(false);
              setRenaming(newContentPiece.id);
              setLoadingAction("");
              notify({ text: "Content piece created", type: "success" });
            } catch (error) {
              notify({ text: "Couldn't create the content piece", type: "error" });
              setLoadingAction("");
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
                if (!props.ancestor) return;

                try {
                  setLoadingAction(props.ancestor.id);
                  await client.contentGroups.delete.mutate({ id: props.ancestor.id });
                  /* setLevels(props.ancestor.ancestors.at(-1) || "", "groups", (groups) => {
                    return groups.filter((groupId) => groupId !== props.ancestor?.id);
                  });
                  setContentGroups(props.ancestor.id, undefined); */
                  setLoadingAction("");
                  notify({ text: "Content group deleted", type: "success" });
                } catch (error) {
                  notify({ text: "Couldn't delete the content group", type: "error" });
                  setLoadingAction("");
                }
              }
            });
          }
        }
      );
    }

    return menuOptions;
  });

  createEffect(() => {
    if (!contentPieces().length) {
      props.setContentPiecesLoading(loading());
    }
  });

  return (
    <div
      class="flex flex-col"
      onDragStart={(event) => {
        const element = document.createElement("div");

        setExpanded(false);
        element.setAttribute(
          "class",
          "fixed left-[9999px] top-[9999px] flex justify-center items-center bg-gray-100 dark:bg-gray-800 h-9 px-2 py-1 rounded-lg"
        );
        element.insertAdjacentHTML(
          "afterbegin",
          `<svg viewBox="0 0 24 24" clip-rule="evenodd" fill-rule="evenodd" class="fill-current h-6 w-6"><path d="${mdiFolder}"/></svg><span class="pl-1 whitespace-nowrap">${props.ancestor.name}</span>`
        );
        document.body.appendChild(element);

        const rect = element.getBoundingClientRect();

        event.dataTransfer?.setDragImage(element, rect.width / 2, rect.height / 2);
        setTimeout(() => {
          document.body.removeChild(element);
        });
      }}
    >
      <div class="flex flex-col overflow-hidden" style={{ "min-width": `${tableWidth()}px` }}>
        <div class="border-b-2 border-r-2 text-left font-500 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 w-full h-12 relative">
          <div class="h-12 flex justify-start items-center gap-3 group px-2 border-b-2 border-transparent">
            <IconButton
              path={mdiChevronDown}
              class={clsx("m-0", expanded() && "transform rotate-180")}
              variant="text"
              onClick={() => {
                setExpanded(!expanded());
              }}
            />
            <Heading level={3}>{props.ancestor.name}</Heading>
            <Dropdown
              placement="bottom-start"
              opened={dropdownOpened()}
              fixed
              class="ml-1 mr-4"
              setOpened={setDropdownOpened}
              activatorButton={() => (
                <IconButton
                  path={mdiDotsHorizontal}
                  class={clsx(
                    "m-0 opacity-0 group-hover:opacity-100",
                    !dropdownOpened() && "opacity-0"
                  )}
                  variant="text"
                  text="soft"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDropdownOpened(true);
                  }}
                />
              )}
            >
              <div class="w-full gap-1 flex flex-col">
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
                        class="justify-start whitespace-nowrap w-full m-0 justify-start"
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
          wrapper="div"
          wrapperProps={{
            class:
              "flex flex-col items-start overflow-hidden transition-all transform duration-300 ease-in-out",
            style: {
              "max-height":
                expanded() && !activeDraggablePiece()
                  ? `${filteredContentPieces().length * 34}px`
                  : activeDraggablePiece()
                    ? "unset"
                    : "0px"
            }
          }}
          each={filteredContentPieces()}
          ref={setSortableRef}
          options={{
            ghostClass: `:base: border-b-2 border-gray-200 dark:border-gray-700 children:invisible`,
            group: "card",
            disabled: !hasPermission("manageDashboard"),
            fallbackOnBody: true,
            onStart(event) {
              // props.onDragStart?.();
              setActiveDraggablePiece(contentPieces()[parseInt(event.item.dataset.index || "0")]);
            },
            onAdd(event) {
              if (typeof event.oldIndex === "number" && typeof event.newIndex === "number") {
                const id = event.item.dataset.contentPieceId || "";
                const baseReferenceContentPiece = contentPieces()[event.newIndex];
                const secondReferenceContentPiece = contentPieces()[event.newIndex - 1];
                const nextReferenceContentPiece = secondReferenceContentPiece;
                const previousReferenceContentPiece = baseReferenceContentPiece;

                client.contentPieces.move.mutate({
                  id,
                  contentGroupId: props.ancestor.id, // props.contentGroup.id,
                  nextReferenceId: nextReferenceContentPiece?.id,
                  previousReferenceId: previousReferenceContentPiece?.id
                });
              }

              const children = [...(event.to?.children || [])] as HTMLElement[];
              const newItems = children.map((value) => {
                return (
                  contentPieces().find(
                    (contentPiece) => contentPiece.id === value.dataset.contentPieceId
                  ) || activeDraggablePiece()
                );
              });

              if (typeof event.newIndex === "number") {
                children.splice(event.newIndex, 1);
              }

              event.to?.replaceChildren(...children);
              /* setContentPieces(
                    newItems.map((item) => ({
                      ...item,
                      contentGroupId: props.contentGroup.id
                    })) as App.FullContentPieceWithAdditionalData[]
                  );*/
            },
            onRemove(event) {
              const children = [...(event.from?.children || [])] as HTMLElement[];
              const newItems = children
                .map((v) => {
                  return contentPieces().find(
                    (contentPiece) => contentPiece.id === v.dataset.contentPieceId
                  );
                })
                .filter((item) => item) as App.FullContentPieceWithAdditionalData[];

              children.splice(event.oldIndex || 0, 0, event.item);
              event.from.replaceChildren(...children);
              // setContentPieces(newItems);
            },
            onUpdate(event) {
              if (typeof event.oldIndex === "number" && typeof event.newIndex === "number") {
                const contentPiece = contentPieces()[event.oldIndex];
                const baseReferenceContentPiece = contentPieces()[event.newIndex];
                const secondReferenceContentPiece =
                  contentPieces()[
                    event.oldIndex < event.newIndex ? event.newIndex + 1 : event.newIndex - 1
                  ];

                let nextReferenceContentPiece = secondReferenceContentPiece;
                let previousReferenceContentPiece = baseReferenceContentPiece;

                if (event.oldIndex < event.newIndex) {
                  nextReferenceContentPiece = baseReferenceContentPiece;
                  previousReferenceContentPiece = secondReferenceContentPiece;
                }

                client.contentPieces.move.mutate({
                  id: contentPiece?.id,
                  nextReferenceId: nextReferenceContentPiece?.id,
                  previousReferenceId: previousReferenceContentPiece?.id
                });
                setActiveDraggablePiece(null);
              }
            },
            onEnd() {
              const children = [...(sortableRef()?.children || [])] as HTMLElement[];
              const newItems = children
                .map((v) => {
                  return contentPieces().find((contentPiece) => {
                    return contentPiece.id.toString() === (v.dataset.contentPieceId || "");
                  });
                })
                .filter((item) => item) as App.FullContentPieceWithAdditionalData[];

              children.sort(
                (a, b) => parseInt(a.dataset.index || "") - parseInt(b.dataset.index || "")
              );
              sortableRef()?.replaceChildren(...children);
              /* setContentPieces(newItems);
                     props.onDragEnd?.(); */
            }
          }}
        >
          {(contentPiece, index) => {
            return <ContentPieceRow contentPiece={contentPiece} />;
          }}
        </Sortable>
      </div>
      <Show when={moreToLoad() && expanded()}>
        <Button
          class="border-b-2 border-r-2 bg-gray-50 rounded-none border-gray-200 dark:border-gray-700 m-0 w-full z-1 flex justify-start items-center"
          onClick={loadMore}
        >
          <div class="mr-1 h-6 w-6 flex justify-center items-center">
            <Show when={!loading()} fallback={<Loader class="h-4 w-4" color="primary" />}>
              <Icon path={mdiDotsHorizontalCircleOutline} class="h-6 w-6 fill-[url(#gradient)]" />
            </Show>
          </div>
          {loading() ? "Loading..." : "Load more"}
        </Button>
      </Show>
    </div>
  );
};

export { ContentPieceList };
