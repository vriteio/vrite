import { HistoryEntry } from "./history-entry";
import { HistoryMenuDataProvider } from "./history-context";
import { Component, For, Show, createMemo } from "solid-js";
import { mdiClose, mdiDotsHorizontalCircleOutline } from "@mdi/js";
import dayjs from "dayjs";
import { useNavigate } from "@solidjs/router";
import { Card, Heading, Icon, IconButton, Loader } from "#components/primitives";
import { App, useContentData, useHistoryData, useLocalStorage } from "#context";
import { ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";

interface EntriesByHour {
  date: string;
  entries: App.VersionWithAdditionalData[];
}
interface EntriesByHourByGroup {
  group: string;
  entries: EntriesByHour[];
}

const HistoryEntriesList: Component = () => {
  const { setStorage } = useLocalStorage();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const { entryIds, versions, moreToLoad, loadMore, loading } = useHistoryData();
  const navigate = useNavigate();
  const dayEntries = createMemo(() => {
    const entriesByHour: EntriesByHour[] = [];

    let lastGroup: string | null = null;

    entryIds().forEach((entryId) => {
      const entry = versions[entryId];

      if (!entry) return;

      const date = dayjs(entry.date).startOf("hour").toISOString();
      const group = entry.label || date;

      if (lastGroup === group) {
        entriesByHour.at(-1)?.entries.push(entry);
      } else {
        lastGroup = group;
        entriesByHour.push({
          entries: [entry],
          date
        });
      }
    });

    return entriesByHour;
  });
  const dayEntriesByGroup = createMemo(() => {
    const entriesByGroup: EntriesByHourByGroup[] = [];
    const today = dayjs().startOf("day");
    const yesterday = today.subtract(1, "day");
    const lastWeek = today.subtract(7, "day");

    let lastGroup: string | null = null;

    dayEntries().forEach((dayEntry) => {
      const date = dayjs(dayEntry.date).add(1, "ms");

      let group = "";

      if (date.isAfter(today)) {
        group = "Today";
      } else if (date.isAfter(yesterday)) {
        group = "Yesterday";
      } else if (date.isAfter(lastWeek)) {
        group = "Last week";
      } else {
        group = date.format("MMMM YYYY");
      }

      if (lastGroup === group) {
        entriesByGroup.at(-1)?.entries.push(dayEntry);
      } else {
        lastGroup = group;
        entriesByGroup.push({
          group,
          entries: [dayEntry]
        });
      }
    });

    return entriesByGroup;
  });

  return (
    <div class="overflow-hidden w-full pl-3 flex flex-col">
      <div class={"flex justify-start items-start mb-1 px-2 pr-5 flex-col"}>
        <div class="flex justify-center items-center w-full">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                rightPanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1 flex-1">
            History
          </Heading>
        </div>
      </div>
      <div class="overflow-hidden relative flex-1 flex flex-col">
        <div class="overflow-y-auto scrollbar-sm-contrast pb-5 " ref={setScrollableContainerRef}>
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <HistoryMenuDataProvider>
            <For
              each={dayEntriesByGroup()}
              fallback={
                <Show when={!loading()}>
                  <Card class="flex flex-col justify-center items-start m-0 px-3.5 mr-3">
                    <Heading level={3}>No history records</Heading>
                    <span class="text-gray-500 dark:text-gray-400">
                      New versions will appear here as you make changes to the content.
                    </span>
                  </Card>
                </Show>
              }
            >
              {({ group, entries }) => {
                return (
                  <>
                    <span class="ml-4 text-gray-500 dark:text-gray-400 text-sm">{group}</span>
                    <For each={entries}>
                      {(entriesByHour) => {
                        return (
                          <HistoryEntry
                            subEntries={entriesByHour.entries.slice(1)}
                            entry={entriesByHour.entries[0]}
                            onClick={(entry) => {
                              navigate(`/version/${entry.contentPieceId}/${entry.id}`);
                            }}
                          />
                        );
                      }}
                    </For>
                  </>
                );
              }}
            </For>

            <Show when={moreToLoad()}>
              <div class="ml-2 pl-1 rounded-l-md flex items-center hover:bg-gray-200 dark:hover:bg-gray-700 flex-1">
                <button
                  class="flex items-center py-0.5"
                  onClick={() => {
                    loadMore();
                  }}
                >
                  <div class="mr-1 h-5 w-5 flex justify-center items-center">
                    <Show when={!loading()} fallback={<Loader class="h-4 w-4" color="primary" />}>
                      <Icon
                        path={mdiDotsHorizontalCircleOutline}
                        class="h-5 w-5 fill-[url(#gradient)]"
                      />
                    </Show>
                  </div>
                  {loading() ? "Loading..." : "Load more"}
                </button>
              </div>
            </Show>
          </HistoryMenuDataProvider>
        </div>
      </div>
    </div>
  );
};
const HistoryView: Component = () => {
  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full" id="history-container">
      <HistoryMenuDataProvider>
        <HistoryEntriesList />
      </HistoryMenuDataProvider>
    </div>
  );
};

export { HistoryView };
