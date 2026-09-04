import {
  Button,
  DropdownArea,
  DropdownMenu,
  IconButton,
  type MenuItem
} from "@andesine/components";
import { type Component, createMemo, For, Show } from "solid-js";
import { TREE_ROOT_ID, Tree, type TreeMap } from "#web/components/tree";
import { VersionHistoryItem, type VersionHistoryVersion } from "./item";
import { VERSION_ITEM_HEIGHT, VersionHistorySkeleton } from "./skeleton";
import clsx from "clsx";

interface VersionHistoryListProps {
  activeVersionID: string;
  assignedChannels?(version: VersionHistoryVersion): string[];
  canManage: boolean;
  canManagePublishing?: boolean;
  canRevert?(version: VersionHistoryVersion): boolean;
  emptyMessage: string;
  failed: boolean;
  fallbackLabel?(version: VersionHistoryVersion): string;
  loading: boolean;
  loadingMore: boolean;
  nextCursor: string | null;
  onAssign?(version: VersionHistoryVersion, channel: string): void;
  onCompare(version: VersionHistoryVersion): void;
  onLoadMore(): void;
  onOpen(version: VersionHistoryVersion): void;
  onRefresh(): void;
  onRename(version: VersionHistoryVersion, name: string): void;
  onRevert?(version: VersionHistoryVersion): void;
  onUnpublish?(version: VersionHistoryVersion, channel: string): void;
  options?: MenuItem[];
  versions: VersionHistoryVersion[];
}

const VersionHistoryList: Component<VersionHistoryListProps> = (props) => {
  const options = () => props.options || [];
  const versionsByID = createMemo(() => {
    return new Map(props.versions.map((version) => [version.id, version]));
  });
  const tree = createMemo<TreeMap>(() => ({
    [TREE_ROOT_ID]: {
      items: props.versions.map((version) => version.id),
      levels: []
    }
  }));

  return (
    <DropdownArea>
      <div class="flex min-h-0 w-full flex-1 flex-col overflow-y-auto px-1 scrollbar-contrast">
        <div class="group/version-header sticky top-0 z-20 -mx-1 flex h-9 shrink-0 items-center gap-2 bg-white px-1 md:bg-gray-100">
          <h2 class="flex-1 text-2xl font-semibold">Versions</h2>
          <Show when={options().length > 0}>
            <DropdownMenu
              title="Versions"
              cardProps={{ class: "w-48" }}
              items={options()}
              mobileSheetDragFromContent={false}
              portal={false}
              trigger={() => (
                <div class="opacity-20 media-mouse:opacity-0 media-mouse:group-hover/version-header:opacity-100">
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    text="soft"
                    variant="text"
                  />
                </div>
              )}
            />
          </Show>
        </div>
        <Show when={!props.loading} fallback={<VersionHistorySkeleton />}>
          <Show
            when={!props.failed}
            fallback={
              <div class="flex flex-1 flex-col">
                <div>
                  <Button
                    class="flex w-full items-center justify-start gap-1 py-0.5 pl-0.5"
                    variant="text"
                    onClick={props.onRefresh}
                  >
                    <div class="flex h-6 w-6 items-center justify-center">
                      <div class="i-lucide:refresh-cw h-4.5 w-4.5 text-gray-400" />
                    </div>
                    <span class="flex-1 text-left line-clamp-1">Try again</span>
                  </Button>
                </div>
                <p class="mx-1 mt-1 text-left text-xs text-gray-400">
                  Versions could not be loaded. Check your connection and try again.
                </p>
              </div>
            }
          >
            <Show
              when={props.versions.length > 0}
              fallback={
                <div class="flex flex-1 flex-col">
                  <div>
                    <For each={options()}>
                      {(option) => (
                        <Button
                          class="flex w-full items-center justify-start gap-1 py-0.5 pl-0.5"
                          variant="text"
                          onClick={() => option.onClick?.()}
                        >
                          <div class="flex h-6 w-6 items-center justify-center">
                            <div class={clsx(option.icon, "h-5 w-5 text-gray-400")} />
                          </div>
                          <span class="flex-1 text-left line-clamp-1">{option.label}</span>
                        </Button>
                      )}
                    </For>
                  </div>
                  <p class="mx-1 mt-1 text-left text-xs text-gray-400">{props.emptyMessage}</p>
                </div>
              }
            >
              <Tree
                tree={tree}
                itemHeight={VERSION_ITEM_HEIGHT}
                renderItem={(versionID) => {
                  const version = versionsByID().get(versionID);

                  if (!version) return null;

                  return (
                    <VersionHistoryItem
                      version={version}
                      fallbackLabel={props.fallbackLabel?.(version)}
                      active={props.activeVersionID === version.id}
                      assignedChannels={props.assignedChannels?.(version)}
                      canManage={props.canManage}
                      canManagePublishing={props.canManagePublishing}
                      onAssign={
                        props.onAssign ? (channel) => props.onAssign?.(version, channel) : undefined
                      }
                      onCompare={() => props.onCompare(version)}
                      onOpen={() => props.onOpen(version)}
                      onRename={(name) => props.onRename(version, name)}
                      onRevert={
                        props.onRevert && (!props.canRevert || props.canRevert(version))
                          ? () => props.onRevert?.(version)
                          : undefined
                      }
                      onUnpublish={
                        props.onUnpublish
                          ? (channel) => props.onUnpublish?.(version, channel)
                          : undefined
                      }
                    />
                  );
                }}
              />
              <Show when={props.nextCursor}>
                <Button
                  class="mt-1 w-full"
                  size="small"
                  text="softer"
                  variant="text"
                  loading={props.loadingMore}
                  onClick={props.onLoadMore}
                >
                  Load more
                </Button>
              </Show>
            </Show>
          </Show>
        </Show>
      </div>
    </DropdownArea>
  );
};

export { VersionHistoryList };
