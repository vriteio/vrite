import { useContent, useShortcuts } from "#web/context";
import { DropdownArea, DropdownMenu } from "#web/components/primitives";
import { Entry } from "#web/lib/client";
import { ExplorerProvider, useExplorer } from "./explorer-context";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { ExplorerEntry } from "./explorer-entry";

const ExplorerSelection = () => {
  const [{ contentTree }] = useContent();
  const [{ selection }] = useExplorer();
  const selectionBlocks = createMemo(() => {
    const selectionBlocks: Array<{
      startIndex: number;
      entries: string[];
    }> = [];
    const contentLevel = contentTree["*"];

    if (!contentLevel) return selectionBlocks;

    let currentSelectionBlock: {
      startIndex: number;
      entries: string[];
    } | null = null;

    contentLevel.entries.forEach((entryID, index) => {
      if (selection().includes(entryID)) {
        if (!currentSelectionBlock) {
          currentSelectionBlock = {
            startIndex: index,
            entries: []
          };
          selectionBlocks.push(currentSelectionBlock);
        }

        currentSelectionBlock.entries.push(entryID);
      } else {
        currentSelectionBlock = null;
      }
    });

    return selectionBlocks;
  });

  return (
    <For each={selectionBlocks()}>
      {(selectionBlock) => {
        return (
          <div
            class="absolute bg-gradient-to-r opacity-10 from-secondary via-primary to-transparent w-full left-0 -z-10 rounded-lg"
            style={{
              top: `${selectionBlock.startIndex * 1.75}rem`,
              height: `${selectionBlock.entries.length * 1.75}rem`
            }}
          />
        );
      }}
    </For>
  );
};
const Explorer = () => {
  const registerShortcuts = useShortcuts();
  const [{ boundingBoxes, selection }, { setSelection, setRenaming }] = useExplorer();
  const [{ entries, contentTree }, { createEntry, deleteEntries }] = useContent();
  const [pointerDown, setPointerDown] = createSignal(false);
  const [boxSelection, setBoxSelection] = createSignal({
    active: false,
    x: 0,
    y: 0,
    currentX: 0,
    currentY: 0,
    width: 0,
    height: 0
  });
  const onPointerDown = (event: PointerEvent) => {
    if (event.button === 0) {
      document.documentElement.style.userSelect = "none";
      setPointerDown(true);
      setBoxSelection({
        active: false,
        x: event.clientX,
        y: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        width: 0,
        height: 0
      });
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!pointerDown()) return;

    const newBoxSelectionWidth = Math.abs(event.clientX - boxSelection().x);
    const newBoxSelectionHeight = Math.abs(event.clientY - boxSelection().y);
    const activationThreshold = 10;
    const newBoxSelection = {
      ...boxSelection(),
      active:
        boxSelection().active ||
        newBoxSelectionWidth > activationThreshold ||
        newBoxSelectionHeight > activationThreshold,
      currentX: event.clientX,
      currentY: event.clientY,
      width: newBoxSelectionWidth,
      height: newBoxSelectionHeight
    };

    setBoxSelection(newBoxSelection);

    if (!newBoxSelection.active) return;

    const selectedIDs: string[] = [];

    Object.entries(boundingBoxes).forEach(([id, boundingBox]) => {
      if (!boundingBox) return;

      const rect = {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height
      };

      if (
        rect.x < Math.max(newBoxSelection.x, newBoxSelection.currentX ?? newBoxSelection.x) &&
        rect.y < Math.max(newBoxSelection.y, newBoxSelection.currentY ?? newBoxSelection.y) &&
        rect.x + rect.width >
          Math.min(newBoxSelection.x, newBoxSelection.currentX ?? newBoxSelection.x) &&
        rect.y + rect.height >
          Math.min(newBoxSelection.y, newBoxSelection.currentY ?? newBoxSelection.y)
      ) {
        selectedIDs.push(id);
      }
    });

    setSelection((currentSelection) => {
      if (`${selectedIDs}` === `${currentSelection}`) {
        return currentSelection;
      }

      return selectedIDs;
    });
  };
  const onPointerEnd = (event: PointerEvent | MouseEvent) => {
    setPointerDown(false);

    if (boxSelection().active) {
      document.documentElement.style.userSelect = "";
      setBoxSelection({
        active: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        currentX: 0,
        currentY: 0
      });
    } else if (!event.metaKey && !event.shiftKey && event.type !== "pointerleave") {
      const isContextMenu = event.button === 2;
      const entryID = (event.target as HTMLElement)
        .closest("[data-entry]")
        ?.getAttribute("data-entry");

      if (!entryID || !selection().includes(entryID)) {
        setSelection((selection) => {
          if (entryID && isContextMenu) {
            return [entryID];
          }

          return selection.length >= 1 ? [] : selection;
        });
      }
    }
  };

  createEffect(() => {
    document.body.addEventListener("pointermove", onPointerMove);
    document.body.addEventListener("pointerup", onPointerEnd);
    document.body.addEventListener("pointerleave", onPointerEnd);
    document.body.addEventListener("contextmenu", onPointerEnd);
    const unregisterShortcuts = registerShortcuts({
      "$mod+E": (event) => {
        createEntry().then((entry) => {
          setRenaming(entry?.id || "");
        });

        return true;
      },
      "$mod+backspace": () => {
        if (selection().length > 0) {
          deleteEntries(selection());
          setSelection([]);

          return true;
        }

        return false;
      },
      "enter": () => {
        if (selection().length === 1) {
          setRenaming(selection()[0]);

          return true;
        }

        return false;
      }
    });

    onCleanup(() => {
      document.body.removeEventListener("pointermove", onPointerMove);
      document.body.removeEventListener("pointerup", onPointerEnd);
      document.body.removeEventListener("pointerleave", onPointerEnd);
      document.body.removeEventListener("contextmenu", onPointerEnd);
      unregisterShortcuts();
    });
  });

  return (
    <DropdownArea>
      <div class="flex-1" onPointerDown={onPointerDown}>
        <h2 class="text-2xl font-semibold my-0.5">Explorer</h2>
        <div class="flex-1 relative">
          <ExplorerSelection />
          <For each={contentTree["*"]?.entries || []}>
            {(entryID) => {
              const entry = entries[entryID] as Entry;

              return (
                <Show when={entry}>
                  <DropdownArea>
                    <ExplorerEntry entry={entry} topLevel />
                  </DropdownArea>
                </Show>
              );
            }}
          </For>
        </div>
        <Show when={boxSelection().active}>
          <div
            class="fixed bg-gradient-to-tr opacity-10 rounded-lg"
            style={{
              top: `${Math.min(boxSelection().y, boxSelection().currentY ?? boxSelection().y)}px`,
              left: `${Math.min(boxSelection().x, boxSelection().currentX ?? boxSelection().x)}px`,
              width: `${boxSelection().width}px`,
              height: `${boxSelection().height}px`
            }}
          />
        </Show>
      </div>
      <DropdownMenu
        cardProps={{
          class: "w-48"
        }}
        options={[
          {
            label: "New entry",
            icon: "i-lucide:file-plus-2",
            shortcut: "$mod+E",
            onClick: async () => {
              const entry = await createEntry();

              setRenaming(entry?.id || "");
            }
          },
          {
            label: "Add schema",
            icon: "i-tabler:pyramid-plus",
            shortcut: "$mod+S"
          }
        ]}
      />
    </DropdownArea>
  );
};
const ExplorerSidePanel = () => {
  return (
    <ExplorerProvider>
      <Explorer />
    </ExplorerProvider>
  );
};

export { ExplorerSidePanel };
