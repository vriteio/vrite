import { TreeRoot, TreeSelection, useTree } from "#web/components/tree";
import { useWorkspace } from "#web/context/workspace";
import {
  type Card,
  createDebounced,
  createRef,
  DropdownArea,
  DropdownMenu,
  IconButton,
  ScrollShadow,
  Skeleton,
  Shortcut
} from "@andesine/components";
import { type ComponentProps, createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { ExplorerCollection } from "./explorer-collection";
import { ExplorerProvider } from "./explorer-context";
import { EXPLORER_GESTURE_PROPS } from "./explorer-dnd";
import { ExplorerEntry } from "./explorer-entry";
import { ExplorerSyncStatusIndicator } from "./explorer-sync-status-indicator";
import { useExplorerActions } from "./use-explorer-actions";
import { useExplorerDrop } from "./use-explorer-drop";
import { isExplorerMenuElement, useExplorerKeyboard } from "./use-explorer-keyboard";
import { useExplorerMarquee } from "./use-explorer-marquee";
import clsx from "clsx";

const Explorer = () => {
  const [{ gap, itemHeight }, { setFocusedID }] = useTree();
  const { content } = useWorkspace();
  const actions = useExplorerActions();
  const [dropRef, setDropRef] = createRef<HTMLElement | null>(null);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [contentContainerRef, setContentContainerRef] = createRef<HTMLElement | null>(null);
  const [titleRef, setTitleRef] = createRef<HTMLElement | null>(null);
  const [pointerInside, setPointerInside] = createSignal(false);
  const [focusInside, setFocusInside] = createSignal(false);
  const [menuOpened, setMenuOpened] = createSignal(false);
  const loading = createDebounced(content.loading, 100);
  const { isDraggedOver } = useExplorerDrop(dropRef);
  const marquee = useExplorerMarquee(scrollableContainerRef, contentContainerRef);
  const scrollItemIntoView = (id: string) => {
    const container = scrollableContainerRef();
    const item = container
      ? Array.from(container.querySelectorAll<HTMLElement>("[data-tree-item]")).find(
          (element) => element.dataset.treeItem === id
        )
      : null;
    if (!container || !item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const visibleTop = titleRef()?.getBoundingClientRect().bottom ?? containerRect.top;

    if (itemRect.top < visibleTop) container.scrollTop -= visibleTop - itemRect.top;
    else if (itemRect.bottom > containerRect.bottom)
      container.scrollTop += itemRect.bottom - containerRect.bottom;
  };
  const keyboard = useExplorerKeyboard({
    active: () => pointerInside() || focusInside(),
    scrollItemIntoView
  });
  const resetFocus = () => {
    setFocusedID(null);
    keyboard.resetRange();
  };
  const options = [
    {
      label: "New entry",
      icon: "i-lucide:file-plus-2",
      shortcut: "$mod+E",
      onClick: async () => actions.createEntry()
    },
    {
      label: "New collection",
      icon: "i-material-symbols:create-new-folder-outline-rounded",
      shortcut: "$mod+shift+E",
      onClick: async () => actions.createCollection()
    }
  ];
  const { collections, entries } = content.tree.getLevel({ parentID: null });

  return (
    <DropdownArea {...EXPLORER_GESTURE_PROPS}>
      <TreeRoot>
        <div
          data-explorer-panel
          tabIndex={0}
          class="flex min-h-0 flex-1 flex-col items-start justify-center outline-none"
          onPointerDown={marquee.onPointerDown}
          onPointerEnter={() => setPointerInside(true)}
          onPointerLeave={(event) => {
            setPointerInside(false);
            if (isExplorerMenuElement(event.relatedTarget)) return;
            if (!focusInside()) resetFocus();
          }}
          onFocusIn={() => setFocusInside(true)}
          onFocusOut={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            setFocusInside(false);
            setPointerInside(false);
            if (isExplorerMenuElement(next)) return;
            resetFocus();
          }}
        >
          <div class="relative flex min-h-0 w-full flex-1">
            <div class="pointer-events-none absolute inset-y-0 left-0 right-3 overflow-hidden">
              <ScrollShadow
                color="contrast"
                offset={{ top: "2.25rem" }}
                scrollableContainerRef={scrollableContainerRef}
              />
            </div>
            <div
              ref={setScrollableContainerRef}
              class="relative flex min-h-0 w-full flex-1 flex-col scrollbar-contrast overflow-y-auto px-1"
            >
              <div
                ref={setTitleRef}
                class="group/explorer-header sticky top-0 z-20 -mx-1 flex h-9 shrink-0 items-center gap-2 px-1 bg-gray-50 md:bg-gray-100"
              >
                <h2 class="text-2xl font-semibold flex-1">Explorer</h2>
                <div
                  class={clsx(
                    "media-mouse:group-hover/explorer-header:opacity-0",
                    menuOpened() && "opacity-0"
                  )}
                >
                  <ExplorerSyncStatusIndicator
                    offline={content.offline()}
                    syncing={content.syncing()}
                  />
                </div>
                <div class="md:absolute right-1">
                  <DropdownMenu
                    title="Explorer"
                    cardProps={
                      {
                        "class": "w-52",
                        "data-tree-interaction": ""
                      } as Partial<ComponentProps<typeof Card>>
                    }
                    items={options}
                    mobileSheetDragFromContent={false}
                    opened={menuOpened()}
                    portal={false}
                    setOpened={setMenuOpened}
                    trigger={() => (
                      <div
                        class={clsx(
                          !menuOpened() &&
                            "opacity-20 media-mouse:opacity-0 media-mouse:group-hover/explorer-header:opacity-100 md:relative"
                        )}
                      >
                        <IconButton
                          icon="i-lucide:ellipsis-vertical"
                          size="small"
                          text="soft"
                          variant="text"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
              <div
                ref={setContentContainerRef}
                class="relative flex flex-1 flex-col"
                style={{ gap }}
              >
                <TreeSelection />
                <Show when={!loading()} fallback={<ExplorerSkeleton itemHeight={itemHeight} />}>
                  <For each={collections()}>
                    {(collection) => (
                      <DropdownArea {...EXPLORER_GESTURE_PROPS}>
                        <ExplorerCollection collection={collection} topLevel />
                      </DropdownArea>
                    )}
                  </For>
                  <For each={entries()}>
                    {(entry) => (
                      <DropdownArea {...EXPLORER_GESTURE_PROPS}>
                        <ExplorerEntry entry={entry} topLevel />
                      </DropdownArea>
                    )}
                  </For>
                  <Show when={!collections().length && !entries().length}>
                    <div>
                      <For each={options}>
                        {(option) => (
                          <IconButton
                            icon={option.icon}
                            class="flex justify-start items-center w-full group/button"
                            disabled={menuOpened() || content.readOnly()}
                            onClick={option.onClick}
                            label={() => (
                              <div class="px-1 flex flex-1 gap-4">
                                <span class="flex-1 text-start">{option.label}</span>
                                <Shortcut
                                  class="opacity-0 media-mouse:group-hover/button:opacity-50 font-mono text-[90%]"
                                  shortcut={option.shortcut}
                                />
                              </div>
                            )}
                            variant="text"
                            text="softer"
                            size="small"
                          />
                        )}
                      </For>
                    </div>
                  </Show>
                </Show>
                <div ref={setDropRef} class="flex-1">
                  <Show when={isDraggedOver()}>
                    <div class="top-0 left-0 -z-10 rounded-lg absolute h-full w-full opacity-10 bg-gradient-to-tr" />
                  </Show>
                </div>
              </div>
            </div>
          </div>
          <Show when={marquee.boxSelection().active}>
            <Portal>
              <div
                class="pointer-events-none fixed z-60 rounded-lg bg-gradient-to-tr opacity-10"
                style={{
                  top: `${Math.min(marquee.boxSelection().y, marquee.boxSelection().currentY)}px`,
                  left: `${Math.min(marquee.boxSelection().x, marquee.boxSelection().currentX)}px`,
                  width: `${marquee.boxSelection().width}px`,
                  height: `${marquee.boxSelection().height}px`
                }}
              />
            </Portal>
          </Show>
        </div>
      </TreeRoot>
    </DropdownArea>
  );
};

const ExplorerSkeleton = (props: { itemHeight: string }) => (
  <>
    {["w-36", "w-44", "w-32", "w-40"].map((className) => (
      <div class="flex gap-1.5 items-center px-1" style={{ height: props.itemHeight }}>
        <Skeleton class={["h-6 w-6", clsx("h-5 rounded-md", className)]} />
      </div>
    ))}
  </>
);

const ExplorerPanel = () => (
  <ExplorerProvider>
    <Explorer />
  </ExplorerProvider>
);

export { ExplorerPanel };
