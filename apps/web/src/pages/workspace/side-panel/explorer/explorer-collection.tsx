import { DropdownArea, DropdownMenu, IconButton } from "@andesine/components";
import { TreeItem, TreeLevel } from "#web/components/tree";
import clsx from "clsx";
import { type Component, Show } from "solid-js";
import { ExplorerEntry } from "./explorer-entry";
import { MAX_CONTENT_NAME_LENGTH, normalizeCollectionName } from "#web/lib/validation";
import { useExplorerCollection, type ExplorerCollectionProps } from "./use-explorer-collection";

const ExplorerCollection: Component<ExplorerCollectionProps> = (props) => {
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
    treeMap
  } = useExplorerCollection(props);
  return (
    <DropdownArea>
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
          <TreeItem
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
                    "h-6 w-6 text-gray-400 dark:text-gray-500 transition-transform",
                    (isSelected(props.collection.id) || isDraggedOver()) && "bg-gradient-to-tr",
                    isExpanded(props.collection.id)
                      ? "i-material-symbols:folder-open-rounded"
                      : "i-material-symbols:folder-rounded"
                  )}
                />
              </div>
            }
            actions={
              <DropdownMenu
                cardProps={{
                  class: "w-48"
                }}
                opened={menuOpened()}
                portal={false}
                setOpened={setMenuOpened}
                trigger={() => (
                  <IconButton
                    class={clsx(!menuOpened() && "opacity-0 group-hover:opacity-100")}
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                  />
                )}
                items={dropdownOptions()}
              />
            }
          />
          <Show when={closestEdge() && !renderBottomDropLineAfterSubtree()}>
            <div
              class={clsx(
                "flex bg-gradient-to-tr h-2.5px w-full absolute items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary z-10",
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
                  <DropdownArea>
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
            <div class="flex bg-gradient-to-tr h-2.5px w-full absolute top-[-1.25px] items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary z-10">
              <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
                <div class="h-1 w-1 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        </Show>
      </div>
    </DropdownArea>
  );
};

export { ExplorerCollection };
