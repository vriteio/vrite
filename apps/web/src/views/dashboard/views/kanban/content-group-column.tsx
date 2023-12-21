import { ContentPieceCard } from "./content-piece-card";
import { Component, createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import {
  mdiDotsVertical,
  mdiFileDocumentPlusOutline,
  mdiFolderPlus,
  mdiIdentifier,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import SortableLib from "sortablejs";
import { Card, IconButton, Sortable, Dropdown, Loader, Icon } from "#components/primitives";
import { MiniEditor, ScrollShadow, createScrollShadowController } from "#components/fragments";
import {
  App,
  useClient,
  useNotifications,
  useConfirmationModal,
  useLocalStorage,
  hasPermission,
  useCommandPalette,
  useContentData,
  ContentLevel
} from "#context";
import { breakpoints, createRef } from "#lib/utils";

interface ContentGroupColumnProps {
  contentGroup: App.ContentGroup;
  index: number;
  onDragStart?(): void;
  onDragEnd?(): void;
  remove?(id?: string): void;
}
interface AddContentGroupColumnProps {
  class?: string;
}

const AddContentGroupColumn: Component<AddContentGroupColumnProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const { activeContentGroupId } = useContentData();
  const { registerCommand } = useCommandPalette();
  const createNewContentGroup = async (): Promise<void> => {
    try {
      await client.contentGroups.create.mutate({
        name: "",
        ancestor: activeContentGroupId() || undefined
      });
      notify({ text: "New content group created", type: "success" });
    } catch (error) {
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
    <div
      class={clsx(
        "px-2.5 pb-2.5 last:pr-5 first:pl-5 md:last:pr-0 md:first:pl-0 h-full snap-center",
        props.class
      )}
    >
      <Card
        class="flex-col flex justify-center items-center w-full h-full m-0 mb-1 bg-transparent border-2 rounded-2xl dark:border-gray-700 text-gray-500 dark:text-gray-400 @hover-bg-gray-300 dark:@hover-bg-gray-700 @hover:cursor-pointer"
        color="contrast"
        onClick={createNewContentGroup}
      >
        <Icon path={mdiFolderPlus} class="h-6 w-6" />
        <span>New group</span>
      </Card>
    </div>
  );
};
const ContentGroupColumn: Component<ContentGroupColumnProps> = (props) => {
  const {
    contentPieces,
    contentLevels,
    contentActions,
    contentLoader,
    activeContentGroupId,
    setActiveContentGroupId,
    activeDraggableContentGroupId,
    setActiveDraggableContentGroupId,
    setActiveDraggableContentPieceId
  } = useContentData();
  const { notify } = useNotifications();
  const { confirmDelete } = useConfirmationModal();
  const { setStorage } = useLocalStorage();
  const scrollShadowController = createScrollShadowController();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const [sortableRef, setSortableRef] = createRef<HTMLElement | null>(null);
  const client = useClient();
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    }> = [
      {
        icon: mdiIdentifier,
        label: "Copy ID",
        async onClick() {
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
      menuOptions.push({
        icon: mdiTrashCan,
        label: "Delete",
        class: "justify-start",
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
              try {
                await client.contentGroups.delete.mutate({ id: props.contentGroup.id });

                if (activeContentGroupId() === props.contentGroup.id) {
                  setActiveContentGroupId(null);
                }

                notify({ text: "Content group deleted", type: "success" });
              } catch (error) {
                notify({ text: "Couldn't delete the content group", type: "success" });
              }
            }
          });
        }
      });
    }

    return menuOptions;
  });
  const [highlight, setHighlight] = createSignal(false);
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

  createEffect(
    on(activeContentGroupId, () => {
      scrollShadowController.processScrollState();
    })
  );
  contentLoader.loadContentLevel(props.contentGroup.id);

  return (
    <div
      class="px-2.5 pb-2.5 last:pr-5 first:pl-5 md:last:pr-0 md:first:pl-0 h-full snap-center"
      data-content-group-id={props.contentGroup.id}
      data-index={props.index}
    >
      <Card class="flex flex-col items-start justify-start h-full p-4 relative m-0 mb-1 pr-2 md:pr-1 overflow-x-hidden content-group select-none">
        <div class="flex items-center justify-center mb-2 w-full">
          <div
            class="flex flex-1 justify-center items-center cursor-pointer overflow-x-hidden"
            ref={(el) => {
              SortableLib.create(el, {
                group: {
                  name: "shared",
                  put: (_to, _from, dragEl) => {
                    return (
                      Boolean(dragEl.dataset.contentGroupId) &&
                      dragEl.dataset.contentGroupId !== props.contentGroup.id
                    );
                  }
                },
                delayOnTouchOnly: true,
                delay: 500,
                fallbackOnBody: true,
                disabled: !hasPermission("manageDashboard") || !breakpoints.md(),
                ghostClass: "!hidden",
                revertOnSpill: true,
                onAdd(evt) {
                  const el = evt.item;

                  el.remove();
                  setHighlight(false);
                  client.contentGroups.move.mutate({
                    id: el.dataset.contentGroupId || "",
                    ancestor: props.contentGroup.id
                  });
                  props.remove?.(el.dataset.contentGroupId || "");
                },
                onStart() {
                  setActiveDraggableContentGroupId(props.contentGroup.id);
                },
                onEnd() {
                  setActiveDraggableContentGroupId(null);
                }
              });
            }}
          >
            <div
              class="flex flex-1 justify-center items-center overflow-hidden"
              data-content-group-id={props.contentGroup.id}
            >
              <MiniEditor
                class={clsx(
                  "inline-flex flex-1 overflow-x-auto content-group-name scrollbar-hidden hover:cursor-text whitespace-nowrap-children",
                  highlight() && "highlight-text"
                )}
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
                }}
              />
            </div>
          </div>
          <Dropdown
            placement="bottom-end"
            opened={dropdownOpened()}
            class="ml-1 mr-3"
            setOpened={setDropdownOpened}
            activatorButton={() => (
              <IconButton
                path={mdiDotsVertical}
                class="justify-start m-0 content-group-menu"
                variant="text"
                text="soft"
              />
            )}
          >
            <div class="w-full gap-1 flex flex-col">
              <For each={menuOptions()}>
                {(item) => {
                  return (
                    <IconButton
                      path={item.icon}
                      label={item.label}
                      variant="text"
                      text="soft"
                      color={item.color}
                      class={clsx("justify-start whitespace-nowrap w-full m-0", item.class)}
                      onClick={item.onClick}
                    />
                  );
                }}
              </For>
            </div>
          </Dropdown>
        </div>
        <div class="relative flex-1 w-full overflow-hidden">
          <ScrollShadow
            scrollableContainerRef={scrollableContainerRef}
            controller={scrollShadowController}
            onScrollEnd={() => {
              contentLoader.loadContentLevel(props.contentGroup.id);
            }}
          />
          <div
            class="w-full h-full pr-2 md:pr-1 overflow-x-hidden overflow-y-scroll scrollbar-sm"
            ref={setScrollableContainerRef}
          >
            <Show
              when={!columnContentLevel().loading || columnContentLevel().pieces.length > 0}
              fallback={
                <div class="flex items-center justify-center min-h-16">
                  <Loader />
                </div>
              }
            >
              <Sortable
                wrapper="div"
                wrapperProps={{ class: "min-h-[calc(100%-1rem)] flex gap-4 flex-col" }}
                each={columnContentLevel().pieces}
                ref={setSortableRef}
                options={{
                  ghostClass: `:base: border-4 border-gray-200 opacity-50 dark:border-gray-700 children:invisible`,
                  group: "card",
                  disabled: !hasPermission("manageDashboard"),
                  fallbackOnBody: true,
                  onStart(event) {
                    props.onDragStart?.();
                    setActiveDraggableContentPieceId(
                      columnContentLevel().pieces[parseInt(event.item.dataset.index || "0")]
                    );
                  },
                  onAdd(event) {
                    if (typeof event.oldIndex !== "number" || typeof event.newIndex !== "number") {
                      return;
                    }

                    const id = event.item.dataset.contentPieceId || "";
                    const baseReferenceContentPieceId = columnContentLevel().pieces[event.newIndex];
                    const secondReferenceContentPieceId =
                      columnContentLevel().pieces[event.newIndex - 1];
                    const nextReferenceContentPieceId = secondReferenceContentPieceId;
                    const previousReferenceContentPieceId = baseReferenceContentPieceId;

                    client.contentPieces.move.mutate({
                      id,
                      contentGroupId: props.contentGroup.id,
                      nextReferenceId: nextReferenceContentPieceId,
                      previousReferenceId: previousReferenceContentPieceId
                    });

                    const children = [...(event.to?.children || [])] as HTMLElement[];

                    if (typeof event.newIndex === "number") {
                      children.splice(event.newIndex, 1);
                    }

                    event.to?.replaceChildren(...children);
                    contentActions.moveContentPiece({
                      contentPiece: {
                        ...contentPieces[id]!,
                        contentGroupId: props.contentGroup.id
                      },
                      nextReferenceId: nextReferenceContentPieceId,
                      previousReferenceId: previousReferenceContentPieceId
                    });
                  },
                  onRemove(event) {
                    const children = [...(event.from?.children || [])] as HTMLElement[];

                    children.splice(event.oldIndex || 0, 0, event.item);
                    event.from.replaceChildren(...children);
                    event.item.remove();
                  },
                  onUpdate(event) {
                    if (typeof event.oldIndex === "number" && typeof event.newIndex === "number") {
                      const contentPieceId = columnContentLevel().pieces[event.oldIndex];
                      const baseReferenceContentPieceId =
                        columnContentLevel().pieces[event.newIndex];
                      const secondReferenceContentPieceId =
                        columnContentLevel().pieces[
                          event.oldIndex < event.newIndex ? event.newIndex + 1 : event.newIndex - 1
                        ];

                      let nextReferenceContentPieceId = secondReferenceContentPieceId;
                      let previousReferenceContentPieceId = baseReferenceContentPieceId;

                      if (event.oldIndex < event.newIndex) {
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

                      setActiveDraggableContentPieceId(null);
                    }
                  },
                  onEnd() {
                    const children = [...(sortableRef()?.children || [])] as HTMLElement[];

                    children.sort(
                      (a, b) => parseInt(a.dataset.index || "") - parseInt(b.dataset.index || "")
                    );
                    sortableRef()?.replaceChildren(...children);
                    props.onDragEnd?.();
                  }
                }}
              >
                {(contentPieceId, index) => {
                  if (contentPieceId && contentPieces[contentPieceId]) {
                    return (
                      <ContentPieceCard
                        contentPiece={contentPieces[contentPieceId]!}
                        index={index()}
                      />
                    );
                  }
                }}
              </Sortable>
            </Show>
          </div>
        </div>
        <Show when={hasPermission("manageDashboard")}>
          <div class="w-full h-16" />
          <Card
            color="soft"
            class="absolute bottom-0 left-0 flex items-center justify-center w-full h-16 m-0 border-b-0 rounded-none border-x-0"
          >
            <IconButton
              class="w-full h-full m-0"
              color="contrast"
              variant="text"
              path={mdiFileDocumentPlusOutline}
              text="soft"
              label="New content piece"
              onClick={async () => {
                const newContentPieceData = {
                  contentGroupId: props.contentGroup.id,
                  referenceId: columnContentLevel().pieces[0],
                  tags: [],
                  members: [],
                  title: ""
                };
                const { id } = await client.contentPieces.create.mutate(newContentPieceData);

                notify({ type: "success", text: "New content piece created" });
                setStorage((storage) => ({
                  ...storage,
                  sidePanelView: "contentPiece",
                  sidePanelWidth: storage.sidePanelWidth || 375,
                  contentPieceId: id
                }));
              }}
            />
          </Card>
        </Show>
      </Card>
    </div>
  );
};

export { ContentGroupColumn, AddContentGroupColumn };
