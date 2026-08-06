import { TreeRoot, TreeSelection, useTree } from "#web/components/tree";
import { useWorkspace } from "#web/context/workspace";
import {
  createDebounced,
  createRef,
  DropdownArea,
  DropdownMenu,
  IconButton,
  Skeleton,
  Shortcut
} from "@andesine/components";
import { createSignal, For, Show } from "solid-js";
import { ExplorerCollection } from "./explorer-collection";
import { ExplorerProvider } from "./explorer-context";
import { ExplorerEntry } from "./explorer-entry";
import { useExplorerActions } from "./use-explorer-actions";
import { useExplorerDrop } from "./use-explorer-drop";
import { useExplorerKeyboard } from "./use-explorer-keyboard";
import { useExplorerMarquee } from "./use-explorer-marquee";
import clsx from "clsx";

const Explorer = () => {
  const [{ gap }, { setFocusedID }] = useTree();
  const { content } = useWorkspace();
  const actions = useExplorerActions();
  const [dropRef, setDropRef] = createRef<HTMLElement | null>(null);
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const [pointerInside, setPointerInside] = createSignal(false);
  const [focusInside, setFocusInside] = createSignal(false);
  const [menuOpened, setMenuOpened] = createSignal(false);
  const loading = createDebounced(content.loading, 100);
  const { isDraggedOver } = useExplorerDrop(dropRef);
  const marquee = useExplorerMarquee(containerRef);
  const scrollItemIntoView = (id: string) => {
    const container = containerRef();
    const item = container
      ? Array.from(container.querySelectorAll<HTMLElement>("[data-tree-item]")).find(
          (element) => element.dataset.treeItem === id
        )
      : null;
    if (!container || !item) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < containerRect.top) container.scrollTop -= containerRect.top - itemRect.top;
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
    <DropdownArea>
      <TreeRoot>
        <div
          data-explorer-panel
          tabIndex={0}
          class="flex flex-col flex-1 justify-center items-start outline-none"
          onPointerDown={marquee.onPointerDown}
          onPointerEnter={() => setPointerInside(true)}
          onPointerLeave={() => {
            setPointerInside(false);
            if (!focusInside()) resetFocus();
          }}
          onFocusIn={() => setFocusInside(true)}
          onFocusOut={(event) => {
            const next = event.relatedTarget;
            if (next instanceof Node && event.currentTarget.contains(next)) return;
            setFocusInside(false);
            setPointerInside(false);
            resetFocus();
          }}
        >
          <div class="my-0.5 flex items-center gap-2 px-1">
            <h2 class="text-2xl font-semibold">Explorer</h2>
            <Show when={content.offline()}>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Offline: read-only
              </span>
            </Show>
          </div>
          <div
            ref={setContainerRef}
            class="flex flex-col flex-1 relative w-full overflow-y-auto px-1"
            style={{ gap: `${gap}px` }}
          >
            <TreeSelection />
            <Show when={!loading()} fallback={<ExplorerSkeleton />}>
              <For each={collections()}>
                {(collection) => (
                  <DropdownArea>
                    <ExplorerCollection collection={collection} topLevel />
                  </DropdownArea>
                )}
              </For>
              <For each={entries()}>
                {(entry) => (
                  <DropdownArea>
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
                              class="opacity-0 group-hover/button:opacity-50 font-mono text-[90%]"
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
          <Show when={marquee.boxSelection().active}>
            <div
              class="pointer-events-none fixed bg-gradient-to-tr opacity-10 rounded-lg"
              style={{
                top: `${Math.min(marquee.boxSelection().y, marquee.boxSelection().currentY)}px`,
                left: `${Math.min(marquee.boxSelection().x, marquee.boxSelection().currentX)}px`,
                width: `${marquee.boxSelection().width}px`,
                height: `${marquee.boxSelection().height}px`
              }}
            />
          </Show>
          <DropdownMenu
            cardProps={{ class: "w-52" }}
            items={options}
            opened={menuOpened()}
            portal={false}
            setOpened={setMenuOpened}
          />
        </div>
      </TreeRoot>
    </DropdownArea>
  );
};

const ExplorerSkeleton = () => (
  <>
    {["w-36", "w-44", "w-32", "w-40"].map((className) => (
      <div class="flex gap-1.5 items-center px-1 h-7">
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
