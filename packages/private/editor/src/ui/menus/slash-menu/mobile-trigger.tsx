import { createRef, IconButton } from "@andesine/components";
import { isTextSelection, type Editor, type Range } from "@tiptap/core";
import { type Accessor, createSignal, onCleanup, onMount, Show, type Component } from "solid-js";
import { Portal } from "solid-js/web";
import { EDITOR_MENU_Z_INDEX } from "#editor/ui/constants";
import { SlashMenuDropdown } from "./dropdown";
import { createSlashMenuItems } from "./items";
import { getAvailableSlashMenuItems } from "./items";
import type { EditorMode } from "#editor/client-types";

interface Position {
  left: number;
  top: number;
}

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const PLACEHOLDER_HIDDEN_ATTRIBUTE = "data-mobile-slash-menu-trigger";
const MobileSlashMenuTrigger: Component<{
  editor: Editor;
  menuContainerRef: Accessor<HTMLElement | null>;
  mode: EditorMode;
}> = (props) => {
  const [positionFrame, setPositionFrame] = createRef<number | null>(null);
  const [activeParagraphElement, setActiveParagraphElementRef] = createRef<HTMLElement | null>(
    null
  );
  const items = createSlashMenuItems();
  const availableItems = () => getAvailableSlashMenuItems(items, props.editor, props.mode);
  const [focused, setFocused] = createSignal(props.editor.isFocused);
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

  const setActiveParagraphElement = (paragraphElement: HTMLElement | null) => {
    const editorContainer = props.editor.view.dom.closest<HTMLElement>("#editor-container");

    if (paragraphElement === activeParagraphElement()) return;

    setActiveParagraphElementRef(paragraphElement);
    editorContainer?.toggleAttribute(PLACEHOLDER_HIDDEN_ATTRIBUTE, Boolean(paragraphElement));
  };
  const captureRange = () => {
    const { selection } = props.editor.state;

    if (isTextSelection(selection) && selection.empty) {
      setRange({ from: selection.from, to: selection.to });
    }
  };
  const updatePosition = () => {
    setPositionFrame(null);

    if (props.editor.isDestroyed || !window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      setPosition(null);
      setActiveParagraphElement(null);
      return;
    }

    if (opened()) return;

    const { selection } = props.editor.state;

    if (!focused() || !isTextSelection(selection) || !selection.empty) {
      setPosition(null);
      setActiveParagraphElement(null);
      return;
    }

    const paragraph = selection.$from.parent;
    const container = props.menuContainerRef();

    if (paragraph.type.name !== "paragraph" || paragraph.content.size !== 0 || !container) {
      setPosition(null);
      setActiveParagraphElement(null);
      return;
    }

    const paragraphPosition = selection.$from.before(selection.$from.depth);
    const paragraphElement = props.editor.view.nodeDOM(paragraphPosition);

    if (!(paragraphElement instanceof HTMLElement) || !paragraphElement.isConnected) {
      setPosition(null);
      setActiveParagraphElement(null);
      return;
    }

    const paragraphRect = paragraphElement.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setActiveParagraphElement(paragraphElement);
    setPosition({
      left: paragraphRect.left - containerRect.left + 4,
      top: paragraphRect.top + paragraphRect.height / 2 - containerRect.top
    });
  };
  const schedulePositionUpdate = () => {
    const currentPositionFrame = positionFrame();

    if (props.editor.isDestroyed) return;
    if (currentPositionFrame !== null) cancelAnimationFrame(currentPositionFrame);
    setPositionFrame(requestAnimationFrame(updatePosition));
  };
  const handleFocus = () => {
    setFocused(true);
    schedulePositionUpdate();
  };
  const handleBlur = () => {
    setFocused(false);
    schedulePositionUpdate();
  };

  onMount(() => {
    props.editor.on("focus", handleFocus);
    props.editor.on("blur", handleBlur);
    props.editor.on("transaction", schedulePositionUpdate);
    window.addEventListener("resize", schedulePositionUpdate);
    schedulePositionUpdate();

    onCleanup(() => {
      const currentPositionFrame = positionFrame();

      if (currentPositionFrame !== null) cancelAnimationFrame(currentPositionFrame);

      setActiveParagraphElement(null);
      props.editor.off("focus", handleFocus);
      props.editor.off("blur", handleBlur);
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
                items={availableItems()}
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
                    class={focused() ? undefined : "hidden"}
                    data-menu
                    icon="i-lucide:plus"
                    label="Add block"
                    variant="text"
                    color="contrast"
                    size="small"
                    text="soft"
                    onPointerDown={(event) => {
                      if (event.button !== 0) return;

                      event.preventDefault();
                      event.stopPropagation();
                      captureRange();
                      setOpened(true);
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
