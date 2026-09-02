import { type Card, DropdownMenu, IconButton, Tooltip } from "@andesine/components";
import { TreeItem } from "#web/components/tree";
import clsx from "clsx";
import { type Component, type ComponentProps, Show } from "solid-js";
import { MAX_CONTENT_NAME_LENGTH, normalizeEntryName } from "#web/lib/validation";
import { useWorkspace } from "#web/context/workspace";
import { usePublishing } from "#web/context/publishing";
import { useExplorerEntry, type ExplorerEntryProps } from "./use-explorer-entry";

const ExplorerEntry: Component<ExplorerEntryProps> = (props) => {
  const { content: workspaceContent } = useWorkspace();
  const publishing = usePublishing();
  const {
    closestEdge,
    content,
    dropdownOptions,
    setElementRef,
    handleClick,
    isSelected,
    menuOpened,
    params,
    selection,
    setMenuOpened,
    swipe
  } = useExplorerEntry(props);
  const publishingStatus = () => publishing.getEntryPublishingStatus(props.entry.id);
  const canEdit = () => {
    return workspaceContent.canEntry(props.entry.collectionID || null, "entry:update");
  };
  const publishingLabel = () => {
    const status = publishingStatus();
    const defaultChannel = publishing.channel() === "published";
    const channelName = publishing.getChannelName();

    if (status === "loading") {
      return defaultChannel ? "Loading publishing status" : `Loading ${channelName} status`;
    }

    if (status === "error") {
      return defaultChannel ? "Publishing status unavailable" : `${channelName} status unavailable`;
    }

    if (status === "published") return defaultChannel ? "Published" : `Published to ${channelName}`;

    return defaultChannel ? "Unpublished" : `Unpublished in ${channelName}`;
  };
  return (
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
        class={clsx("flex relative w-full touch-pan-y", !swipe.swiping() && "transition-transform")}
        data-entry={props.entry.id}
        data-explorer-item
        style={{ transform: `translateX(-${swipe.offset()}px)` }}
      >
        <TreeItem
          class="!overflow-visible"
          id={props.entry.id}
          label={props.entry.name}
          topLevel={props.topLevel}
          icon={
            <div class="relative h-full w-full">
              <div
                class={clsx(
                  "h-full w-full text-gray-400 i-lucide:file-text",
                  isSelected(props.entry.id) && "bg-gradient-to-tr"
                )}
              />
              <Show
                when={
                  publishingStatus() &&
                  publishingStatus() !== "outside" &&
                  publishingStatus() !== "loading" &&
                  publishingStatus() !== "published"
                }
              >
                <Tooltip
                  content={publishingLabel()}
                  placement="right"
                  wrapperClass="absolute -top-0.5 -left-0.5 h-3 w-3"
                >
                  <div
                    class={clsx(
                      "flex h-3 w-3 items-center justify-center rounded-lg bg-gray-100/80"
                    )}
                  >
                    <div
                      class={clsx(
                        "flex justify-center items-center h-2.5 w-2.5 i-lucide:radio",
                        publishingStatus() === "error" && "text-red-500",
                        publishingStatus() === "unpublished" && "text-amber-500"
                      )}
                    />
                  </div>
                </Tooltip>
              </Show>
            </div>
          }
          selectable
          ref={setElementRef}
          onClick={handleClick}
          onRename={(name) => {
            if (content.readOnly(props.entry.collectionID || null)) return;

            content.entries.update({
              entryID: props.entry.id,
              updates: { name: normalizeEntryName(name) }
            });
          }}
          labelMaxLength={MAX_CONTENT_NAME_LENGTH}
          actions={
            <>
              <DropdownMenu
                title={props.entry.name}
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
                onClick={(event) => event.stopPropagation()}
                trigger={() => (
                  <Show when={selection().length <= 1} fallback={<div />}>
                    <div
                      class={clsx(
                        "shrink-0",
                        swipe.swiping() && "flex",
                        !swipe.swiping() &&
                          (props.entry.id === params.slug
                            ? !menuOpened() &&
                              "opacity-20 media-mouse:opacity-0 media-mouse:group-hover:opacity-100"
                            : !menuOpened() &&
                              "opacity-20 media-mouse:hidden media-mouse:group-hover:flex media-mouse:group-hover:opacity-100"),
                        !swipe.swiping() && "transition-transform"
                      )}
                      style={{
                        opacity: swipe.swiping() ? `${0.2 + swipe.progress() * 0.8}` : undefined,
                        transform: `translateX(${swipe.offset()}px)`
                      }}
                    >
                      <IconButton
                        data-entry-menu-trigger
                        icon="i-lucide:ellipsis-vertical"
                        size="small"
                        variant="text"
                        text="soft"
                      />
                    </div>
                  </Show>
                )}
                items={dropdownOptions()}
              />
              <Show when={props.entry.id === params.slug && !menuOpened()}>
                <div
                  class={clsx(
                    "hidden media-mouse:flex justify-center items-center h-7 w-7 absolute right-0 top-0",
                    selection().length <= 1 && "media-mouse:group-hover:hidden"
                  )}
                >
                  <div
                    class={clsx(
                      "bg-gradient-to-tr h-4 w-4 from-secondary via-primary to-secondary",
                      canEdit() ? "i-lucide:pencil" : "i-lucide:eye"
                    )}
                  />
                </div>
              </Show>
            </>
          }
        />
      </div>
      <Show when={closestEdge()}>
        <div
          class={clsx(
            "flex bg-gradient-to-tr h-2.5px w-full absolute items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-tertiary z-10",
            closestEdge() === "top" ? "-top-[1.25px]" : "-bottom-[1.25px]"
          )}
        >
          <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
            <div class="h-1 w-1 bg-gray-50 md:bg-gray-100 rounded-full" />
          </div>
        </div>
      </Show>
    </div>
  );
};

export { ExplorerEntry };
