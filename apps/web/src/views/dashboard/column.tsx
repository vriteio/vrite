import { ContentPieceCard } from "./content-piece-card";
import { useContentGroupsContext } from "./content-groups-context";
import {
  Component,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  on,
  Show
} from "solid-js";
import {
  mdiDotsVertical,
  mdiFileDocumentPlus,
  mdiFolder,
  mdiFolderPlus,
  mdiIdentifier,
  mdiLock,
  mdiLockOpen,
  mdiTrashCan
} from "@mdi/js";
import clsx from "clsx";
import {
  Card,
  IconButton,
  Sortable,
  Dropdown,
  Loader,
  Tooltip,
  Icon
} from "#components/primitives";
import { MiniEditor, ScrollShadow, createScrollShadowController } from "#components/fragments";
import {
  App,
  useClientContext,
  useNotificationsContext,
  useConfirmationContext,
  useUIContext,
  hasPermission,
  useCacheContext
} from "#context";
import { createRef } from "#lib/utils";

interface ColumnProps {
  contentGroup: App.ContentGroup;
  index: number;
  onDragStart?(): void;
  onDragEnd?(): void;
}
interface AddColumnProps {
  class?: string;
}

const AddColumn: Component<AddColumnProps> = (props) => {
  const { client } = useClientContext();
  const { notify } = useNotificationsContext();
  const { ancestor } = useContentGroupsContext();

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
        onClick={async () => {
          const ancestors: string[] = [];

          try {
            if (ancestor()) {
              ancestors.push(...ancestor()!.ancestors, ancestor()!.id);
            }

            await client.contentGroups.create.mutate({
              name: "",
              ancestors
            });
            notify({ text: "New content group created", type: "success" });
          } catch (error) {
            notify({ text: "Couldn't create new content group", type: "error" });
          }
        }}
      >
        <Icon path={mdiFolderPlus} class="h-6 w-6" />
        <span>New group</span>
      </Card>
    </div>
  );
};
const Column: Component<ColumnProps> = (props) => {
  const { useContentPieces } = useCacheContext();
  const { notify } = useNotificationsContext();
  const { confirmDelete } = useConfirmationContext();
  const { setStorage } = useUIContext();
  const { contentPieces, setContentPieces, loadMore, loading } = useContentPieces(
    props.contentGroup.id
  );
  const { activeDraggable, setActiveDraggable, ancestor, setAncestor } = useContentGroupsContext();
  const scrollShadowController = createScrollShadowController();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const [sortableRef, setSortableRef] = createRef<HTMLElement | null>(null);
  const { client } = useClientContext();
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
      menuOptions.push(
        {
          icon: mdiFolderPlus,
          label: "Subgroup",
          onClick() {
            const ancestors: string[] = [];

            if (ancestor()) {
              ancestors.push(...ancestor()!.ancestors, ancestor()!.id);
            }

            ancestors.push(props.contentGroup.id);
            client.contentGroups.create.mutate({ ancestors, name: "" });
          }
        },
        {
          icon: props.contentGroup.locked ? mdiLockOpen : mdiLock,
          label: props.contentGroup.locked ? "Unlock" : "Lock",
          async onClick() {
            await client.contentGroups.update.mutate({
              id: props.contentGroup.id,
              locked: !props.contentGroup.locked
            });
            setContentPieces(
              contentPieces().map((contentPiece) => {
                return {
                  ...contentPiece,
                  locked: !props.contentGroup.locked
                };
              })
            );
            setDropdownOpened(false);
          }
        }
      );
    }

    if (!props.contentGroup.locked && hasPermission("manageDashboard")) {
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
                setStorage((storage) => ({
                  ...storage,
                  ...(contentPieces().find((contentPiece) => {
                    return contentPiece.contentGroupId === props.contentGroup.id;
                  }) && { contentPieceId: undefined })
                }));
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
  const [subgroups] = createResource(() => {
    return client.contentGroups.list.query({ ancestorId: props.contentGroup.id });
  });

  createEffect(
    on(contentPieces, () => {
      scrollShadowController.processScrollState();
    })
  );

  return (
    <div
      class="px-2.5 pb-2.5 last:pr-5 first:pl-5 md:last:pr-0 md:first:pl-0 h-full snap-center"
      data-content-group-id={props.contentGroup.id}
      data-index={props.index}
    >
      <Card class="flex flex-col items-start justify-start h-full p-4 relative m-0 mb-1 pr-2 md:pr-1 overflow-hidden content-group select-none">
        <div class="flex items-center justify-center mb-2 w-full">
          <Show when={props.contentGroup.locked}>
            <Tooltip text="Edit-locked" side="right">
              <IconButton
                badge
                path={mdiLock}
                variant="text"
                class="m-0 mr-1"
                text="base"
                color="primary"
              />
            </Tooltip>
          </Show>
          <MiniEditor
            class="inline-flex flex-1 overflow-x-auto content-group-name scrollbar-hidden"
            content="paragraph"
            initialValue={props.contentGroup.name}
            readOnly={props.contentGroup.locked || !hasPermission("manageDashboard")}
            placeholder="Group name"
            onBlur={(editor) => {
              client.contentGroups.update.mutate({
                id: props.contentGroup.id,
                name: editor.getText()
              });
            }}
          />
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
              loadMore();
            }}
          />
          <div
            class="w-full h-full pr-2 md:pr-1 overflow-x-hidden overflow-y-scroll scrollbar-sm"
            ref={setScrollableContainerRef}
          >
            <Show
              when={!loading() || contentPieces().length > 0}
              fallback={
                <div class="flex items-center justify-center min-h-16">
                  <Loader />
                </div>
              }
            >
              <Sortable
                wrapper="div"
                wrapperProps={{ class: "min-h-[calc(100%-1rem)] flex gap-4 flex-col" }}
                each={contentPieces()}
                ref={setSortableRef}
                options={{
                  ghostClass: `:base: border-4 border-gray-200 opacity-50 dark:border-gray-700 children:invisible`,
                  group: "card",
                  scroll: true,
                  fallbackOnBody: true,
                  scrollSpeed: 10,
                  scrollSensitivity: 100,
                  onStart(event) {
                    props.onDragStart?.();
                    setActiveDraggable(contentPieces()[parseInt(event.item.dataset.index || "0")]);
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
                        contentGroupId: props.contentGroup.id,
                        nextReferenceId: nextReferenceContentPiece?.id,
                        previousReferenceId: previousReferenceContentPiece?.id
                      });
                    }

                    const children = [...(event.to?.children || [])] as HTMLElement[];
                    const newItems = children.map((value) => {
                      return (
                        contentPieces().find(
                          (contentPiece) => contentPiece.id === value.dataset.contentPieceId
                        ) || activeDraggable()
                      );
                    });

                    if (typeof event.newIndex === "number") {
                      children.splice(event.newIndex, 1);
                    }

                    event.to?.replaceChildren(...children);
                    setContentPieces(
                      newItems.map((item) => ({
                        ...item,
                        locked: props.contentGroup.locked,
                        contentGroupId: props.contentGroup.id
                      })) as App.FullContentPieceWithAdditionalData[]
                    );
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
                    setContentPieces(newItems);
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
                      setActiveDraggable(null);
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
                    setContentPieces(newItems);
                    props.onDragEnd?.();
                  }
                }}
              >
                {(contentPiece, index) => {
                  return <ContentPieceCard contentPiece={contentPiece} index={index()} />;
                }}
              </Sortable>
            </Show>
          </div>
        </div>
        <Show when={!props.contentGroup.locked && hasPermission("manageDashboard")}>
          <div class={clsx("w-full", subgroups()?.length ? "h-24" : "h-16")} />
          <Show when={subgroups()?.length}>
            <div class="flex gap-1 w-full overflow-x-auto overflow-y-hidden scrollbar-sm absolute bottom-16 left-0 p-1">
              <For each={subgroups() || []}>
                {(subContentGroup) => {
                  return (
                    <IconButton
                      onClick={() => setAncestor(props.contentGroup)}
                      label={subContentGroup.name}
                      path={mdiFolder}
                      text="soft"
                      class="m-0 whitespace-nowrap"
                      variant="text"
                    />
                  );
                }}
              </For>
            </div>
          </Show>
          <Card
            color="soft"
            class="absolute bottom-0 left-0 flex items-center justify-center w-full h-16 m-0 border-b-0 rounded-none border-x-0"
          >
            <IconButton
              class="w-full h-full m-0"
              color="contrast"
              variant="text"
              path={mdiFileDocumentPlus}
              text="soft"
              label="New content piece"
              onClick={async () => {
                const { id } = await client.contentPieces.create.mutate({
                  contentGroupId: props.contentGroup.id,
                  referenceId: contentPieces()[0]?.id,
                  tags: [],
                  members: [],
                  title: ""
                });

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

export { Column, AddColumn };
