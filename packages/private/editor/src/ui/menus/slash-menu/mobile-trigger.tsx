import { IconButton } from "@andesine/components";
import { isTextSelection, type Editor, type Range } from "@tiptap/core";
import { type Accessor, createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import { Portal } from "solid-js/web";
import { EDITOR_MENU_Z_INDEX } from "#editor/ui/constants";
import { SlashMenuDropdown } from "./dropdown";
import { createSlashMenuItems } from "./items";

interface Position {
  left: number;
  top: number;
}

const MobileSlashMenuTrigger: Component<{
  editor: Editor;
  menuContainerRef: Accessor<HTMLElement | null>;
}> = (props) => {
  const items = createSlashMenuItems();
  const [opened, setOpened] = createSignal(false);
  const [position, setPosition] = createSignal<Position | null>(null, {
    equals: (previous, next) => {
      return (
        previous === next ||
        (previous !== null &&
          next !== null &&
          previous.left === next.left &&
          previous.top === next.top)
      );
    }
  });
  const [range, setRange] = createSignal<Range | null>(null, {
    equals: (previous, next) =>
      previous === next ||
      (previous !== null && next !== null && previous.from === next.from && previous.to === next.to)
  });

  let positionFrame: number | null = null;

  const captureRange = () => {
    const { selection } = props.editor.state;

    if (isTextSelection(selection) && selection.empty) {
      setRange({ from: selection.from, to: selection.to });
    }
  };
  const updatePosition = () => {
    positionFrame = null;

    if (opened() || props.editor.isDestroyed || !window.matchMedia("(max-width: 767px)").matches) {
      setPosition(null);
      return;
    }

    const { selection } = props.editor.state;

    if (!props.editor.isFocused || !isTextSelection(selection) || !selection.empty) {
      setPosition(null);
      return;
    }

    const paragraph = selection.$from.parent;
    const container = props.menuContainerRef();

    if (paragraph.type.name !== "paragraph" || paragraph.content.size !== 0 || !container) {
      setPosition(null);
      return;
    }

    const paragraphPosition = selection.$from.before(selection.$from.depth);
    const paragraphElement = props.editor.view.nodeDOM(paragraphPosition);

    if (!(paragraphElement instanceof HTMLElement) || !paragraphElement.isConnected) {
      setPosition(null);
      return;
    }

    const paragraphRect = paragraphElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setPosition({
      left: paragraphRect.left - containerRect.left + 4,
      top: paragraphRect.top + paragraphRect.height / 2 - containerRect.top
    });
  };
  const schedulePositionUpdate = () => {
    if (props.editor.isDestroyed) return;
    if (positionFrame !== null) cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(updatePosition);
  };

  onMount(() => {
    props.editor.on("focus", schedulePositionUpdate);
    props.editor.on("blur", schedulePositionUpdate);
    props.editor.on("transaction", schedulePositionUpdate);
    window.addEventListener("resize", schedulePositionUpdate);
    schedulePositionUpdate();

    onCleanup(() => {
      if (positionFrame !== null) cancelAnimationFrame(positionFrame);
      props.editor.off("focus", schedulePositionUpdate);
      props.editor.off("blur", schedulePositionUpdate);
      props.editor.off("transaction", schedulePositionUpdate);
      window.removeEventListener("resize", schedulePositionUpdate);
    });
  });

  return (
    <Show when={props.menuContainerRef()} keyed>
      {(menuContainer) => (
        <Portal mount={menuContainer}>
          <Show when={position()}>
            {(currentPosition) => (
              <SlashMenuDropdown
                class="absolute pointer-events-auto -translate-y-1/2 md:hidden"
                items={items}
                opened={opened()}
                setOpened={(nextOpened) => {
                  const wasOpened = opened();

                  if (wasOpened === nextOpened) return;
                  if (nextOpened) captureRange();
                  setOpened(nextOpened);
                  if (wasOpened && !nextOpened) schedulePositionUpdate();
                }}
                style={{
                  "left": `${currentPosition().left}px`,
                  "top": `${currentPosition().top}px`,
                  "z-index": EDITOR_MENU_Z_INDEX.slashMenu
                }}
                trigger={() => (
                  <IconButton
                    aria-label="Add block"
                    data-menu
                    icon="i-lucide:plus"
                    label="Add block"
                    variant="text"
                    color="contrast"
                    size="small"
                    text="soft"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  />
                )}
                onSelect={(item) => {
                  const targetRange = range();

                  if (targetRange) void item.command({ editor: props.editor, range: targetRange });
                }}
              />
            )}
          </Show>
        </Portal>
      )}
    </Show>
  );
};

export { MobileSlashMenuTrigger };
