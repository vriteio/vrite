import { DropdownMenu, IconButton } from "@andesine/components";
import { TreeItem } from "#web/components/tree";
import clsx from "clsx";
import { type Component, Show } from "solid-js";
import { MAX_CONTENT_NAME_LENGTH, normalizeEntryName } from "#web/lib/validation";
import { useExplorerEntry, type ExplorerEntryProps } from "./use-explorer-entry";

const ExplorerEntry: Component<ExplorerEntryProps> = (props) => {
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
    setMenuOpened
  } = useExplorerEntry(props);
  return (
    <div class="flex relative min-h-7">
      <div class="flex relative w-full" data-entry={props.entry.id}>
        <TreeItem
          id={props.entry.id}
          label={props.entry.name}
          topLevel={props.topLevel}
          icon={
            <div
              class={clsx(
                "h-full w-full text-gray-400 i-lucide:file-text",
                isSelected(props.entry.id) && "bg-gradient-to-tr"
              )}
            />
          }
          selectable
          ref={setElementRef}
          onClick={handleClick}
          onRename={(name) => {
            if (content.readOnly()) return;

            content.entries.update({
              entryID: props.entry.id,
              updates: { name: normalizeEntryName(name) }
            });
          }}
          labelMaxLength={MAX_CONTENT_NAME_LENGTH}
          actions={
            <>
              <DropdownMenu
                cardProps={{
                  class: "w-48"
                }}
                opened={menuOpened()}
                portal={false}
                setOpened={setMenuOpened}
                onClick={(event) => event.stopPropagation()}
                trigger={() => (
                  <Show when={selection().length <= 1} fallback={<div />}>
                    <div
                      class={clsx(
                        "",
                        props.entry.id === params.slug
                          ? !menuOpened() && "opacity-0 media-mouse:group-hover:opacity-100"
                          : !menuOpened() && "hidden media-mouse:group-hover:flex"
                      )}
                    >
                      <IconButton
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
                    "flex justify-center items-center h-7 w-7 absolute right-0 top-0",
                    selection().length <= 1 && "media-mouse:group-hover:hidden"
                  )}
                >
                  <div class="i-lucide:pencil bg-gradient-to-tr h-4 w-4 from-secondary via-primary to-secondary" />
                </div>
              </Show>
            </>
          }
        />
      </div>
      <Show when={closestEdge()}>
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
  );
};

export { ExplorerEntry };
