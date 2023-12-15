import { mdiAccountCircle, mdiCalendar, mdiFileDocumentOutline } from "@mdi/js";
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
  createMemo,
  useContext
} from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { Button, Icon, IconButton, Heading } from "#components/primitives";
import { tagColorClasses } from "#lib/utils";
import { useLocalStorage, App } from "#context";

interface DashboardListViewColumn {
  header: string;
  width?: number;
  minWidth?: number;
  id?: string;
  headerRef?: HTMLElement;
  cell?: Component<{
    contentPiece: App.ContentPieceWithAdditionalData;
    column: DashboardListViewColumn | null;
  }>;
}

type DashboardListViewContextType = {
  columns: Array<DashboardListViewColumn | null>;
  tableWidth: Accessor<number>;
  setColumns: SetStoreFunction<Array<DashboardListViewColumn | null>>;
};

const DashboardListViewContext = createContext<DashboardListViewContextType>();
const DashboardListViewDataProvider: ParentComponent = (props) => {
  const [columns, setColumns] = createStore<Array<DashboardListViewColumn | null>>([
    {
      header: "Title",
      width: 500,
      minWidth: 250,
      id: "title",
      cell: (props) => {
        const { setStorage } = useLocalStorage();

        return (
          <button
            class="px-2 text-start min-h-9 flex justify-start items-center group hover:cursor-pointer w-full"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                sidePanelView: "contentPiece",
                sidePanelWidth: storage.sidePanelWidth || 375,
                contentPieceId: props.contentPiece.id
              }));
            }}
          >
            <div class="mr-1 h-6 w-6 flex justify-center items-center">
              <Icon
                path={mdiFileDocumentOutline}
                class="h-6 w-6 group-hover:fill-[url(#gradient)]"
              />
            </div>
            <Heading
              level={4}
              class="font-semibold clamp-1 group-hover:bg-gradient-to-tr group-hover:text-transparent group-hover:bg-clip-text group-hover:underline"
            >
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
          <Show when={props.contentPiece.date}>
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
          </Show>
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

  return (
    <DashboardListViewContext.Provider value={{ columns, setColumns, tableWidth }}>
      {props.children}
    </DashboardListViewContext.Provider>
  );
};
const useDashboardListViewData = (): DashboardListViewContextType => {
  return useContext(DashboardListViewContext)!;
};

export { DashboardListViewDataProvider, useDashboardListViewData };
