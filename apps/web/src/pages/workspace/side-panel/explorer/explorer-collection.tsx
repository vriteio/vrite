import {
  type Card,
  DropdownArea,
  DropdownMenu,
  IconButton,
  Spinner,
  Tooltip
} from "@andesine/components";
import { TreeItem, TreeLevel } from "#web/components/tree";
import clsx from "clsx";
import { type Component, type ComponentProps, Show } from "solid-js";
import { ExplorerEntry } from "./explorer-entry";
import { MAX_CONTENT_NAME_LENGTH, normalizeCollectionName } from "#web/lib/validation";
import { useExplorerCollection, type ExplorerCollectionProps } from "./use-explorer-collection";
import { EXPLORER_GESTURE_PROPS } from "./explorer-dnd";
import { usePublishing } from "#web/context/publishing";

const ExplorerCollection: Component<ExplorerCollectionProps> = (props) => {
  const publishing = usePublishing();
  const {
    BoundaryDropTarget,
    closestEdge,
    content,
    dropdownOptions,
    isDraggedOver,
    isExpanded,
    isExpandedEmpty,
    isSelected,
    menuOpened,
    renderBottomDropLineAfterSubtree,
    setElementRef,
    setIsChildOrderDraggedOver,
    setMenuOpened,
    setSubtreeRef,
    toggleExpanded,
    treeMap,
    swipe
  } = useExplorerCollection(props);
  const publishingEnabled = () => content.isCollectionPublishingEnabled(props.collection.id);
  const unpublishedCount = () => {
    return publishing.getCollectionUnpublishedCount(props.collection.id);
  };
  const publishingLabel = () => {
    const count = unpublishedCount();
    const defaultChannel = publishing.channel() === "published";
    const channelName = publishing.getChannelName();

    if (publishing.statusLoading()) {
      return defaultChannel ? "Loading publishing status" : `Loading ${channelName} status`;
    }

    if (publishing.statusError()) {
      return defaultChannel ? "Publishing status unavailable" : `${channelName} status unavailable`;
    }

    if (count === 0) return defaultChannel ? "Published" : `Published to ${channelName}`;

    const label = `${count} unpublished ${count === 1 ? "entry" : "entries"}`;

    return defaultChannel ? label : `${label} in ${channelName}`;
  };
  return (
    <DropdownArea {...EXPLORER_GESTURE_PROPS}>
      <div class="relative">
        <Show when={isDraggedOver() && isExpandedEmpty() && !isSelected(props.collection.id)}>
          <div
            class={clsx(
              "absolute inset-0 -z-10 rounded-r-lg opacity-10 from-secondary via-primary to-transparent bg-gradient-to-r",
              props.topLevel && "rounded-l-lg"
            )}
          />
        </Show>
        <div class="flex relative min-h-7">
          <Show when={swipe.swiping()}>
            <div class="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-gray-50 to-transparent">
              <div
                class={clsx(
                  "absolute inset-y-0 right-full w-screen bg-gray-50",
                  !props.topLevel && "border-r border-gray-300"
                )}
              />
            </div>
          </Show>
          <div
            {...swipe.gestureProps}
            class={clsx(
              "flex relative w-full touch-pan-y",
              !swipe.swiping() && "transition-transform"
            )}
            data-explorer-item
            style={{ transform: `translateX(-${swipe.offset()}px)` }}
          >
            <TreeItem
              class="!overflow-visible"
              id={props.collection.id}
              label={props.collection.name}
              topLevel={props.topLevel}
              highlighted={isDraggedOver() && !isExpandedEmpty()}
              selectable
              ref={setElementRef}
              dataAttributes={{ collection: props.collection.id }}
              onClick={() => {
                toggleExpanded(props.collection.id);
              }}
              onRename={(name) => {
                if (content.readOnly()) return;

                const normalizedName = normalizeCollectionName(name);

                if (!normalizedName) return;

                content.collections.update({
                  collectionID: props.collection.id,
                  updates: { name: normalizedName }
                });
              }}
              labelMaxLength={MAX_CONTENT_NAME_LENGTH}
              icon={
                <div class="relative flex justify-center items-center">
                  <div
                    data-element="collection-icon"
                    class={clsx(
                      "h-6 w-6 text-gray-400 transition-transform",
                      (isSelected(props.collection.id) || isDraggedOver()) && "bg-gradient-to-tr",
                      isExpanded(props.collection.id)
                        ? "i-material-symbols:folder-open-rounded"
                        : "i-material-symbols:folder-rounded"
                    )}
                  />
                  <Show when={publishingEnabled()}>
                    <Tooltip
                      content={publishingLabel()}
                      placement="right"
                      wrapperClass="absolute -bottom-1 -right-1 h-3 w-3"
                    >
                      <div class="flex h-3 w-3 items-center justify-center">
                        <Show
                          when={!publishing.statusLoading()}
                          fallback={<Spinner class="h-2 w-2" color="primary" />}
                        >
                          <div
                            class={clsx(
                              "flex justify-center items-center h-2 w-2 shadow-sm",
                              publishing.statusError() &&
                                "bg-red-500/90 rounded-full shadow-red-500/50",
                              !publishing.statusError() &&
                                unpublishedCount() === 0 &&
                                "bg-green-500/90 rounded-full shadow-green-500/50",
                              !publishing.statusError() &&
                                unpublishedCount() > 0 &&
                                "bg-amber-500/90 rounded-full shadow-amber-500/50"
                            )}
                          />
                        </Show>
                      </div>
                    </Tooltip>
                  </Show>
                </div>
              }
              actions={
                <DropdownMenu
                  title={props.collection.name}
                  cardProps={
                    {
                      "class": "w-52",
                      "data-tree-interaction": ""
                    } as Partial<ComponentProps<typeof Card>>
                  }
                  opened={menuOpened()}
                  mobileSheetDragFromContent={false}
                  portal={false}
                  setOpened={setMenuOpened}
                  trigger={() => (
                    <div
                      class={clsx(
                        "flex shrink-0",
                        !menuOpened() &&
                          !swipe.swiping() &&
                          "opacity-20 media-mouse:opacity-0 media-mouse:group-hover:opacity-100",
                        !swipe.swiping() && "transition-transform"
                      )}
                      style={{
                        opacity: swipe.swiping() ? `${0.2 + swipe.progress() * 0.8}` : undefined,
                        transform: `translateX(${swipe.offset()}px)`
                      }}
                    >
                      <IconButton
                        data-collection-menu-trigger
                        icon="i-lucide:ellipsis-vertical"
                        size="small"
                        variant="text"
                        text="soft"
                      />
                    </div>
                  )}
                  items={dropdownOptions()}
                />
              }
            />
          </div>
          <Show when={closestEdge() && !renderBottomDropLineAfterSubtree()}>
            <div
              class={clsx(
                "flex bg-gradient-to-tr h-2.5px w-full absolute items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-tertiary z-10",
                closestEdge() === "top" ? "-top-[1.25px]" : "-bottom-[1.25px]"
              )}
            >
              <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
                <div class="h-1 w-1 bg-gray-100 rounded-full" />
              </div>
            </div>
          </Show>
        </div>
        <div ref={setSubtreeRef}>
          <TreeLevel
            levelID={props.collection.id}
            tree={treeMap}
            emptyMessage="Collection empty"
            highlighted={isDraggedOver()}
            highlightBackground={!isExpandedEmpty()}
            renderCollectionBoundary={() => <BoundaryDropTarget type="collection" />}
            renderEntryBoundary={() => <BoundaryDropTarget type="entry" />}
            renderLevel={(id) => {
              const collection = () => content.collections.get({ collectionID: id });

              return (
                <Show when={collection()}>
                  <ExplorerCollection
                    collection={collection()!}
                    onParentDragHighlightChange={setIsChildOrderDraggedOver}
                  />
                </Show>
              );
            }}
            renderItem={(entryID) => {
              const entry = () => content.entries.get({ entryID });

              return (
                <Show when={entry()}>
                  <DropdownArea {...EXPLORER_GESTURE_PROPS}>
                    <ExplorerEntry
                      entry={entry()!}
                      onParentDragHighlightChange={setIsChildOrderDraggedOver}
                    />
                  </DropdownArea>
                </Show>
              );
            }}
          />
        </div>
        <Show when={renderBottomDropLineAfterSubtree()}>
          <div class="relative h-0">
            <div class="flex bg-gradient-to-tr h-2.5px w-full absolute top-[-1.25px] items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-tertiary z-10">
              <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
                <div class="h-1 w-1 bg-gray-50 md:bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        </Show>
      </div>
    </DropdownArea>
  );
};

export { ExplorerCollection };
