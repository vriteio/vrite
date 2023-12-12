import { ContentGroupsContextProvider } from "../../content-groups-context";
import {
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  onCleanup,
  onMount
} from "solid-js";
import {
  mdiAccountCircle,
  mdiCalendar,
  mdiChevronDown,
  mdiDotsVertical,
  mdiFilePlus,
  mdiFolderPlus,
  mdiPlus
} from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import clsx from "clsx";
import { createStore } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import {
  Button,
  Card,
  Dropdown,
  Heading,
  Icon,
  IconButton,
  Loader,
  Tooltip
} from "#components/primitives";
import {
  App,
  useCache,
  useClient,
  useCommandPalette,
  useLocalStorage,
  useNotifications
} from "#context";
import { useContentPieces } from "#lib/composables";
import { breakpoints, tagColorClasses } from "#lib/utils";
import { ScrollShadow } from "#components/fragments";

interface DashboardListViewProps {
  ancestor?: App.ContentGroup | null;
  contentGroupsLoading?: boolean;
  contentGroups: App.ContentGroup<string>[];
  setAncestor(ancestor: App.ContentGroup | null | undefined): void;
  setContentGroups(contentGroups: App.ContentGroup<string>[]): void;
}

const NewContentGroupButton: Component<{ ancestor: App.ContentGroup }> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const { registerCommand } = useCommandPalette();
  const createNewGroup = async (): Promise<void> => {
    try {
      await client.contentGroups.create.mutate({
        name: "",
        ancestor: props.ancestor?.id
      });
      notify({ text: "New content group created", type: "success" });
    } catch (error) {
      notify({ text: "Couldn't create new content group", type: "error" });
    }
  };

  registerCommand({
    action: createNewGroup,
    category: "dashboard",
    icon: mdiFolderPlus,
    name: "New content group"
  });

  return (
    <IconButton
      path={mdiFolderPlus}
      class="whitespace-nowrap w-full m-0 justify-start"
      text="soft"
      variant="text"
      color="base"
      label="New group"
      onClick={createNewGroup}
    />
  );
};
const NewContentPieceButton: Component<{
  ancestor: App.ContentGroup;
}> = (props) => {
  const cache = useCache();
  const client = useClient();
  const { notify } = useNotifications();
  const { setStorage } = useLocalStorage();
  const { registerCommand } = useCommandPalette();
  const { contentPieces } = cache(`contentPieces:${props.ancestor.id}`, () => {
    return useContentPieces(props.ancestor.id);
  });
  const createNewContentPiece = async (): Promise<void> => {
    if (props.ancestor) {
      const { id } = await client.contentPieces.create.mutate({
        contentGroupId: props.ancestor.id,
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
    }
  };

  registerCommand({
    action: createNewContentPiece,
    category: "dashboard",
    icon: mdiFilePlus,
    name: "New content piece"
  });

  return (
    <IconButton
      path={mdiFilePlus}
      class="whitespace-nowrap w-full m-0 justify-start"
      text="soft"
      variant="text"
      color="base"
      label="New content piece"
      onClick={createNewContentPiece}
    />
  );
};
const [columns, setColumns] = createStore<
  Array<{
    header: string;
    width?: number;
    minWidth?: number;
    id?: string;
    headerRef?: HTMLElement;
    cell?: Component<{ contentPiece: App.ContentPieceWithAdditionalData }>;
  } | null>
>([
  {
    header: "Title",
    width: 500,
    minWidth: 250,
    id: "title",
    cell: (props) => {
      const { setStorage } = useLocalStorage();

      return (
        <button
          class="px-2 text-start min-h-9 flex justify-start items-center hover:bg-gradient-to-tr hover:text-transparent hover:bg-clip-text hover:underline hover:cursor-pointer w-full"
          onClick={() => {
            setStorage((storage) => ({
              ...storage,
              sidePanelView: "contentPiece",
              sidePanelWidth: storage.sidePanelWidth || 375,
              contentPieceId: props.contentPiece.id
            }));
          }}
        >
          <Heading level={4} class="font-semibold clamp-1">
            <div
              class="contents"
              innerHTML={DOMPurify.sanitize(props.contentPiece.title || "[No Title]")}
            />
          </Heading>
        </button>
      );
    }
  },
  {
    header: "Tags",
    width: 250,
    minWidth: 150,
    id: "tags",
    cell: (props) => {
      const lengthLimit = 21;
      const displayTags = createMemo(() => {
        const visibleTags: App.Tag[] = [];
        const hiddenTags: App.Tag[] = [];

        let length = 0;

        props.contentPiece.tags.forEach((tag, index) => {
          length += tag.label.length;

          if (length < lengthLimit && index < 3) {
            visibleTags.push(tag);
          } else {
            hiddenTags.push(tag);
          }
        });

        return { visible: visibleTags, hidden: hiddenTags };
      });

      return (
        <div class="overflow-hidden flex justify-start items-center gap-2 h-full px-2">
          <For each={displayTags().visible}>
            {(tag) => {
              return (
                <button
                  class={clsx(
                    tagColorClasses[tag.color],
                    "rounded-md px-1 border-2 h-6 text-sm flex justify-start items-center font-semibold",
                    "border-opacity-50 bg-opacity-20 dark:(border-opacity-50 bg-opacity-20) hover:opacity-80"
                  )}
                >
                  {tag.label}
                </button>
              );
            }}
          </For>
          <Show when={displayTags().hidden.length > 0}>
            <Button text="soft" class="font-bold m-0" size="small">
              +{displayTags().hidden.length}
            </Button>
          </Show>
        </div>
      );
    }
  },
  {
    header: "Members",
    width: 250,
    minWidth: 150,
    id: "members",
    cell: (props) => {
      return (
        <div class="overflow-hidden flex justify-start items-center gap-2 h-full px-2">
          <For each={props.contentPiece.members.slice(0, 3)}>
            {(member) => {
              return (
                <Button
                  class="rounded-md h-6 pl-0.5 pr-1 m-0 text-sm flex gap-1 justify-start items-center font-semibold"
                  size="small"
                  badge
                >
                  <Show
                    when={member.profile?.avatar}
                    fallback={
                      <div class="relative">
                        <Icon path={mdiAccountCircle} class="h-5 w-5 rounded-full" />
                      </div>
                    }
                  >
                    <img src={member.profile?.avatar} class="h-5 w-5 rounded-full" />
                  </Show>
                  <span>
                    <span class="opacity-70">@</span>
                    {member.profile.username}
                  </span>
                </Button>
              );
            }}
          </For>
        </div>
      );
    }
  },
  {
    header: "Date",
    width: 250,
    minWidth: 150,
    id: "date",
    cell: (props) => {
      return (
        <div class="overflow-hidden flex justify-start items-center gap-2 h-full px-2">
          <IconButton
            variant="text"
            path={mdiCalendar}
            size="small"
            class="m-0 justify-start whitespace-nowrap"
            hover={false}
            badge
            label={dayjs(props.contentPiece.date).format("MMM D, YYYY")}
            text="soft"
          />
        </div>
      );
    }
  },
  null
]);
const tableWidth = createMemo(() => {
  return columns.reduce((total, column) => {
    return total + (column?.width || 0);
  }, 0);
});
const ContentPieceList: Component<{
  ancestor: App.ContentGroup;
  removedContentPieces?: string[];
  setContentPiecesLoading(loading: boolean): void;
}> = (props) => {
  const cache = useCache();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = createSignal(true);
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

  createEffect(() => {
    if (!contentPieces().length) {
      props.setContentPiecesLoading(loading());
    }
  });

  return (
    <div class="flex flex-col" ref={setScrollableContainerRef}>
      <div class="flex flex-col overflow-hidden" style={{ "min-width": `${tableWidth()}px` }}>
        <div class="border-b-2 border-r-2 text-left font-500 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 relative p-2 w-full">
          <div class="h-9 flex justify-start items-center gap-3 group">
            <IconButton
              path={mdiChevronDown}
              class={clsx("m-0", expanded() && "transform rotate-180")}
              onClick={() => {
                setExpanded(!expanded());
              }}
            />
            <Heading level={3} class="flex-1">
              {props.ancestor.name}
            </Heading>
            <IconButton
              path={mdiDotsVertical}
              class="m-0 opacity-0 group-hover:opacity-100"
              variant="text"
              text="soft"
            />
          </div>
        </div>
        <div
          class="flex flex-col items-start overflow-hidden transform transition-all duration-300 ease-in-out"
          style={{
            "max-height": expanded() ? `${filteredContentPieces().length * 38}px` : "0px"
          }}
        >
          <For each={filteredContentPieces()}>
            {(contentPiece) => {
              return (
                <div class="flex justify-center items-center border-b-2 text-left font-500 border-gray-300 dark:border-gray-700 relative w-full hover:bg-gray-700 hover:bg-opacity-40">
                  <For each={columns}>
                    {(column) => {
                      return (
                        <div
                          class={clsx(
                            "border-r-2 border-gray-300 dark:border-gray-700 h-9",
                            !column && "flex-1"
                          )}
                          style={{
                            "min-width": column ? `${column.width}px` : undefined,
                            "max-width": column ? `${column.width}px` : undefined
                          }}
                        >
                          <Show when={column}>
                            <Dynamic component={column?.cell} contentPiece={contentPiece} />
                          </Show>
                        </div>
                      );
                    }}
                  </For>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      <Show when={moreToLoad()}>
        <Button
          class="border-y-2 bg-gray-50 rounded-none border-gray-200 dark:border-gray-700 m-0 sticky left-0 bottom-0 w-full z-1"
          loading={loading()}
          onClick={loadMore}
        >
          Load more
        </Button>
      </Show>
    </div>
  );
};
const DashboardListView: Component<DashboardListViewProps> = (props) => {
  const client = useClient();
  const [contentPiecesLoading, setContentPiecesLoading] = createSignal(false);
  const [removedContentPieces, setRemovedContentPieces] = createSignal<string[]>([]);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [higherAncestor] = createResource(
    () => props.ancestor,
    (ancestor) => {
      const higherAncestorId = ancestor?.ancestors[ancestor.ancestors.length - 1];

      if (!higherAncestorId) return null;

      try {
        return client.contentGroups.get.query({ id: higherAncestorId });
      } catch (error) {
        return null;
      }
    }
  );
  const [resizedHeader, setResizedHeader] = createSignal("");

  onMount(() => {
    document.body.addEventListener("pointermove", (event) => {
      const headerId = resizedHeader();

      if (headerId) {
        const headerIndex = columns.findIndex((header) => header?.id === headerId);
        const header = columns[headerIndex];
        const ref = header?.headerRef;

        if (!ref) return;

        const { clientX } = event;
        const { left } = ref.getBoundingClientRect() || { left: 0 };
        const width = clientX - left;

        setColumns(headerIndex, "width", Math.max(width, header?.minWidth || 0));
        event.preventDefault();
      }
    });
    document.body.addEventListener("pointerup", () => {
      setResizedHeader("");
    });
  });
  createEffect(
    on(
      () => props.ancestor,
      () => {
        setRemovedContentPieces([]);
      }
    )
  );

  return (
    <div class="relative overflow-hidden w-full">
      <ContentGroupsContextProvider ancestor={() => props.ancestor} setAncestor={props.setAncestor}>
        <div
          class="flex flex-col w-full h-full overflow-x-auto overscroll-none scrollbar-contrast"
          ref={setScrollableContainerRef}
        >
          <ScrollShadow
            color="contrast"
            scrollableContainerRef={scrollableContainerRef}
            offset={{ top: "32px" }}
          />
          <ScrollShadow
            color="contrast"
            direction="horizontal"
            scrollableContainerRef={scrollableContainerRef}
          />
          <div
            style={{
              "min-width": `${tableWidth()}px`
            }}
          >
            <div class="flex bg-gray-50 dark:bg-gray-900 sticky top-0 z-1 overflow-x-hidden">
              <For each={columns}>
                {(column, index) => {
                  return (
                    <div
                      class={clsx(
                        "flex justify-center items-center border-r-2 first:border-l-0 border-b-2 text-left font-500 border-gray-300 dark:border-gray-700 relative bg-gray-200 border-gray-300 dark:bg-gray-700 dark:bg-opacity-30 dark:border-gray-700",
                        !column && "flex-1"
                      )}
                      ref={(element) => {
                        if (column) setColumns(index(), "headerRef", element);
                      }}
                      style={{
                        "min-width": column ? `${column.width}px` : undefined,
                        "max-width": column ? `${column.width}px` : undefined
                      }}
                    >
                      <Show when={column}>
                        <span class="text-gray-500 dark:text-gray-400 font-semibold flex-1 px-2">
                          {column?.header}
                        </span>
                        <IconButton path={mdiDotsVertical} class="m-0" variant="text" text="soft" />
                        <div
                          class="flex justify-center items-center absolute h-full -right-11px w-5 hover:cursor-col-resize group z-1"
                          onPointerDown={(event) => {
                            setResizedHeader(column?.id || "");
                            event.preventDefault();
                          }}
                        >
                          <div
                            class={clsx(
                              "group-hover:bg-gradient-to-tr h-full w-3px rounded-full",
                              resizedHeader() === column?.id && "bg-gradient-to-tr"
                            )}
                          />
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
            <For each={props.contentGroups}>
              {(contentGroup) => {
                return (
                  <ContentPieceList
                    ancestor={contentGroup}
                    setContentPiecesLoading={setContentPiecesLoading}
                    removedContentPieces={removedContentPieces()}
                  />
                );
              }}
            </For>
          </div>
          <Show
            when={props.contentGroupsLoading || contentPiecesLoading() || higherAncestor.loading}
          >
            <div class="h-full w-full absolute top-0 left-0 bg-gray-100 dark:bg-gray-800 flex justify-center items-center">
              <Loader />
            </div>
          </Show>
        </div>
        <Show
          when={breakpoints.md()}
          fallback={
            <Dropdown
              class="z-10"
              activatorButton={() => (
                <IconButton
                  path={mdiPlus}
                  size="large"
                  text="soft"
                  class="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-4 right-4"
                />
              )}
            >
              <div class="w-full gap-1 flex flex-col">
                <Show when={props.ancestor} keyed>
                  <NewContentPieceButton ancestor={props.ancestor!} />
                </Show>
                <NewContentGroupButton ancestor={props.ancestor!} />
              </div>
            </Dropdown>
          }
        >
          <Card class="flex fixed bottom-18 md:bottom-4 right-4 m-0 gap-2 z-10" color="soft">
            <Show when={props.ancestor} keyed>
              <NewContentPieceButton ancestor={props.ancestor!} />
            </Show>
            <NewContentGroupButton ancestor={props.ancestor!} />
          </Card>
        </Show>
      </ContentGroupsContextProvider>
    </div>
  );
};

export { DashboardListView };
