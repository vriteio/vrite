import {
  mdiAccountCircle,
  mdiAccountMultipleOutline,
  mdiCalendarOutline,
  mdiFileDocumentOutline,
  mdiFileOutline,
  mdiFormatTitle,
  mdiLink,
  mdiLinkVariant,
  mdiTagOutline
} from "@mdi/js";
import clsx from "clsx";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import {
  Accessor,
  Component,
  For,
  ParentComponent,
  Show,
  createContext,
  createEffect,
  createMemo,
  on,
  useContext
} from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { debounce } from "@solid-primitives/scheduled";
import { Button, Icon, Heading } from "#components/primitives";
import { Ref, tagColorClasses } from "#lib/utils";
import { App, useAuthenticatedUserData, useClient, useContentData } from "#context";

interface DashboardTableViewDataProviderProps {
  container: Ref<HTMLElement | null>[0];
}
interface DashboardTableViewColumnConfig {
  id: string;
  width: number;
  ref?: HTMLElement;
}
interface DashboardTableViewColumnDef {
  id: string;
  label: string;
  icon: string;
  minWidth: number;
  cell: Component<{
    contentPiece: App.ContentPieceWithAdditionalData;
    columnDef: DashboardTableViewColumnDef;
    column: DashboardTableViewColumnConfig;
  }>;
}

type DashboardTableViewContextType = {
  columnDefs: Record<string, DashboardTableViewColumnDef>;
  columns: DashboardTableViewColumnConfig[];
  container: Ref<HTMLElement | null>[0];
  tableWidth: Accessor<number>;
  setColumns: SetStoreFunction<DashboardTableViewColumnConfig[]>;
};

const DashboardTableViewContext = createContext<DashboardTableViewContextType>();
const DashboardTableViewDataProvider: ParentComponent<DashboardTableViewDataProviderProps> = (
  props
) => {
  const { workspaceSettings } = useAuthenticatedUserData();
  const { activeContentPieceId } = useContentData();
  const client = useClient();
  const columnDefs: Record<string, DashboardTableViewColumnDef> = {
    title: {
      label: "Title",
      id: "title",
      minWidth: 250,
      icon: mdiFormatTitle,
      cell: (props) => {
        const active = (): boolean => activeContentPieceId() === props.contentPiece.id;

        return (
          <div class="px-2 text-start min-h-8 flex justify-start items-center w-full">
            <div class="mr-1 h-6 w-6 flex justify-center items-center">
              <Icon
                path={mdiFileDocumentOutline}
                class={clsx("h-6 w-6", active() && "fill-[url(#gradient)]")}
              />
            </div>
            <Heading
              level={4}
              class={clsx(
                "font-semibold clamp-1 text-start",
                active() && "bg-gradient-to-tr text-transparent bg-clip-text"
              )}
            >
              <div
                class="contents"
                innerHTML={DOMPurify.sanitize(props.contentPiece.title || "[No Title]")}
              />
            </Heading>
          </div>
        );
      }
    },
    filename: {
      label: "Filename",
      minWidth: 150,
      id: "filename",
      icon: mdiFileOutline,
      cell: (props) => {
        return (
          <Show when={props.contentPiece.filename}>
            <div class="flex justify-start items-center gap-2 h-full px-2 text-gray-500 dark:text-gray-400 text-sm">
              <span class="clamp-1 text-start">{props.contentPiece.filename}</span>
            </div>
          </Show>
        );
      }
    },
    slug: {
      label: "Slug",
      minWidth: 150,
      id: "slug",
      icon: mdiLink,
      cell: (props) => {
        return (
          <div class="flex justify-start items-center gap-2 h-full px-2 text-gray-500 dark:text-gray-400 text-sm">
            <span class="clamp-1 text-start">{props.contentPiece.slug}</span>
          </div>
        );
      }
    },
    canonicalLink: {
      label: "Canonical Link",
      minWidth: 200,
      id: "canonicalLink",
      icon: mdiLinkVariant,
      cell: (props) => {
        return (
          <Show when={props.contentPiece.canonicalLink}>
            <div class="flex justify-start items-center gap-2 h-full px-2 text-gray-500 dark:text-gray-400 text-sm">
              <a
                class="clamp-1 text-start underline"
                href={props.contentPiece.canonicalLink || ""}
                target="_blank"
              >
                {props.contentPiece.canonicalLink || ""}
              </a>
            </div>
          </Show>
        );
      }
    },
    date: {
      label: "Date",
      minWidth: 120,
      id: "date",
      icon: mdiCalendarOutline,
      cell: (props) => {
        return (
          <Show when={props.contentPiece.date}>
            <div class="flex justify-start items-center gap-2 h-full px-2 text-gray-500 dark:text-gray-400 text-sm">
              <span class="clamp-1 text-start">
                {dayjs(props.contentPiece.date).format("MMM D, YYYY")}
              </span>
            </div>
          </Show>
        );
      }
    },
    tags: {
      label: "Tags",
      id: "tags",
      icon: mdiTagOutline,
      minWidth: 150,
      cell: (props) => {
        const displayTags = createMemo(() => {
          const visibleTags: App.Tag[] = [];
          const hiddenTags: App.Tag[] = [];

          let usedWidth = (props.contentPiece.tags.length + 1) * 8 + 24;

          props.contentPiece.tags.forEach((tag) => {
            usedWidth += 10 + 8 * tag.label.length;

            if (usedWidth < (props.column?.width || 0)) {
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
    members: {
      label: "Members",
      minWidth: 150,
      id: "members",
      icon: mdiAccountMultipleOutline,
      cell: (props) => {
        const displayMembers = createMemo(() => {
          const visible: App.ContentPieceMember[] = [];
          const hidden: App.ContentPieceMember[] = [];

          let usedWidth = (props.contentPiece.members.length + 1) * 8 + 24;

          props.contentPiece.members.forEach((tag) => {
            usedWidth += 40 + 8 * tag.profile.username.length;

            if (usedWidth < (props.column?.width || 0)) {
              visible.push(tag);
            } else {
              hidden.push(tag);
            }
          });

          return { visible, hidden };
        });

        return (
          <div class="overflow-hidden flex justify-start items-center gap-2 h-full px-2">
            <For each={displayMembers().visible}>
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
            <Show when={displayMembers().hidden.length > 0}>
              <Button text="soft" class="font-bold m-0" size="small">
                +{displayMembers().hidden.length}
              </Button>
            </Show>
          </div>
        );
      }
    }
  };
  const [columns, setColumns] = createStore<DashboardTableViewColumnConfig[]>([
    {
      id: "title",
      width: 250
    },
    {
      id: "date",
      width: 150
    },
    {
      id: "tags",
      width: 150
    },
    {
      id: "members",
      width: 150
    }
  ]);
  const tableWidth = createMemo(() => {
    return columns.reduce((total, column) => {
      return total + (column.width || 0);
    }, 66);
  });
  const debouncedColumnsUpdate = debounce(() => {
    client.workspaceSettings.update.mutate({
      dashboardViews: {
        table: columns.map((column) => ({
          id: column.id,
          width: column.width
        }))
      }
    });
  }, 1000);

  let ignoreNextUpdate = true;

  createEffect(
    on(
      () => workspaceSettings()?.dashboardViews?.table,
      () => {
        ignoreNextUpdate = true;
        setColumns(
          (workspaceSettings()?.dashboardViews?.table || columns).map((column) => {
            const existingColumnRef = columns.find(
              (existingColumn) => existingColumn.id === column.id
            )?.ref;

            return {
              ...column,
              ref: existingColumnRef
            };
          })
        );
      }
    )
  );
  createEffect(() => {
    // Handle show/hide/reorder columns
    if (!ignoreNextUpdate) debouncedColumnsUpdate();

    columns.forEach((column) => {
      column.width;
    });
    ignoreNextUpdate = false;
  });

  return (
    <DashboardTableViewContext.Provider
      value={{ columnDefs, columns, setColumns, tableWidth, container: props.container }}
    >
      {props.children}
    </DashboardTableViewContext.Provider>
  );
};
const useDashboardTableViewData = (): DashboardTableViewContextType => {
  return useContext(DashboardTableViewContext)!;
};

export { DashboardTableViewDataProvider, useDashboardTableViewData };
export type { DashboardTableViewColumnConfig, DashboardTableViewColumnDef };
