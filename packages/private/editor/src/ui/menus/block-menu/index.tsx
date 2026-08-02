import { isBlockSelection } from "#editor/extensions";
import { DropdownArea, DropdownMenu, IconButton, useShortcuts } from "@andesine/components";
import { Editor, isTextSelection } from "@tiptap/core";
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  ParentComponent,
  useContext
} from "solid-js";

interface BlockMenuAreaProps {
  editor: Editor | null;
  notify(type: "success" | "error", text: string): void;
}
interface BlockMenuProps {
  editor: Editor | null;
}

const BlockMenuContext = createContext<{
  handleCopy(): boolean;
  handleDelete(): boolean;
  openMenu(reference?: HTMLElement): void;
}>({
  handleCopy: () => false,
  handleDelete: () => false,
  openMenu: () => {}
});
const BlockMenuArea: ParentComponent<BlockMenuAreaProps> = (props) => {
  const registerShortcuts = useShortcuts();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const [menuAnchorPoint, setMenuAnchorPoint] = createSignal<{ x: number; y: number } | null>(null);
  const handleCopy = () => {
    const editor = props.editor;

    if (!editor || editor.isDestroyed) return false;

    const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content());

    void (async () => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([dom.innerHTML], { type: "text/html" })
          })
        ]);
      } catch {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          props.notify("error", "Failed to copy blocks to the clipboard.");
        }
      }
    })();

    return true;
  };
  const handleDelete = () => {
    const editor = props.editor;

    if (!editor || editor.isDestroyed) return false;

    editor.chain().focus().deleteSelection().run();

    return true;
  };
  const openMenu = (reference?: HTMLElement) => {
    if (reference) {
      const referenceRect = reference.getBoundingClientRect();

      setMenuAnchorPoint({
        x: referenceRect.right,
        y: referenceRect.bottom
      });
    } else {
      setMenuAnchorPoint(null);
    }

    setMenuOpened(true);
  };
  const handleMenuOpenedChange = (opened: boolean) => {
    setMenuOpened(opened);

    if (!opened) {
      setMenuAnchorPoint(null);
    }
  };

  createEffect(() => {
    const editor = props.editor;

    if (!editor || editor.isDestroyed) return;

    const canHandleShortcut = (event: KeyboardEvent) => {
      const target = event.target;

      return (
        !editor.isDestroyed &&
        target instanceof Node &&
        editor.view.dom.contains(target) &&
        isBlockSelection(editor.state.selection)
      );
    };
    const unregister = registerShortcuts({
      "$mod+backspace": (event) => canHandleShortcut(event) && handleDelete(),
      "$mod+c": (event) => canHandleShortcut(event) && handleCopy()
    });

    onCleanup(unregister);
  });

  return (
    <BlockMenuContext.Provider
      value={{
        handleCopy,
        handleDelete,
        openMenu
      }}
    >
      <DropdownArea
        enabled={(event) => {
          if (!props.editor) {
            return false;
          }

          const { view, state } = props.editor;
          const { selection } = state;

          if (!isBlockSelection(selection) && isTextSelection(selection) && !selection.empty) {
            return false;
          }

          return view.dom.contains(event.target as Node);
        }}
      >
        {props.children}
        <BlockMenu
          anchorPoint={menuAnchorPoint()}
          editor={props.editor}
          menuOpened={menuOpened()}
          setMenuOpened={handleMenuOpenedChange}
        />
      </DropdownArea>
    </BlockMenuContext.Provider>
  );
};
const BlockMenu: ParentComponent<
  BlockMenuProps & {
    anchorPoint: { x: number; y: number } | null;
    menuOpened: boolean;
    setMenuOpened(opened: boolean): void;
  }
> = (props) => {
  const { handleCopy, handleDelete } = useContext(BlockMenuContext);
  let currentNodePos = -1;
  const [coords, setCoords] = createSignal({ top: -10000, left: -10000 });
  const [hoverAreaHeight, setHoverAreaHeight] = createSignal(0);
  const [visible, setVisible] = createSignal(false);
  let lastPointerPosition: { x: number; y: number } | null = null;
  const RIGHT_THRESHOLD_PERCENT = 0.3;
  const handleOpenedChange = (opened: boolean) => {
    props.setMenuOpened(opened);

    if (!opened) {
      setVisible(false);
    }
  };

  createEffect(() => {
    const editor = props.editor;

    if (!editor) {
      setVisible(false);
      return;
    }

    const updatePosition = (event: PointerEvent) => {
      try {
        const { state, view } = editor;
        const pointerPosition = view.posAtCoords({
          left: event.clientX,
          top: event.clientY
        });

        if (!pointerPosition) {
          setVisible(false);
          return;
        }

        const resolvedPosition = state.doc.resolve(pointerPosition.pos);

        if (resolvedPosition.depth < 1) {
          setVisible(false);
          return;
        }

        const targetPos = resolvedPosition.before(1);
        const node = state.doc.nodeAt(targetPos);
        const dom = view.nodeDOM(targetPos);

        if (!(dom instanceof HTMLElement) || node?.type.name === "title") {
          setVisible(false);
          return;
        }

        const blockRect = dom.getBoundingClientRect();
        const scrollContainer = editor.view.dom.closest(".overflow-auto");

        if (!(scrollContainer instanceof HTMLElement)) {
          setVisible(false);
          return;
        }

        const scrollContainerRect = scrollContainer.getBoundingClientRect();
        const distanceFromRight = blockRect.right - event.clientX;
        const isNearRightEdge =
          distanceFromRight >= 0 && distanceFromRight <= blockRect.width * RIGHT_THRESHOLD_PERCENT;

        if (!isNearRightEdge) {
          setVisible(false);
          return;
        }

        currentNodePos = targetPos;
        setCoords({
          top: blockRect.top - scrollContainerRect.top + scrollContainer.scrollTop,
          left: blockRect.right - scrollContainerRect.left + scrollContainer.scrollLeft + 8
        });
        setHoverAreaHeight(blockRect.height);
        setVisible(true);
      } catch {
        setVisible(false);
      }
    };
    const handlePointerMoveCapture = (event: PointerEvent) => {
      if (lastPointerPosition?.x === event.clientX && lastPointerPosition.y === event.clientY) {
        event.stopImmediatePropagation();
        return;
      }

      lastPointerPosition = { x: event.clientX, y: event.clientY };
    };
    const hideTrigger = (event: PointerEvent) => {
      if (
        event.relatedTarget instanceof HTMLElement &&
        event.relatedTarget.closest("[data-block-menu-trigger]")
      ) {
        return;
      }

      if (!props.menuOpened) {
        setVisible(false);
      }
    };
    const editorElement = editor.view.dom;

    editorElement.addEventListener("pointermove", handlePointerMoveCapture, true);
    editorElement.addEventListener("pointermove", updatePosition);
    editorElement.addEventListener("pointerleave", hideTrigger);
    onCleanup(() => {
      editorElement.removeEventListener("pointermove", handlePointerMoveCapture, true);
      editorElement.removeEventListener("pointermove", updatePosition);
      editorElement.removeEventListener("pointerleave", hideTrigger);
    });
  });

  return (
    <DropdownMenu
      anchorPoint={props.anchorPoint}
      trigger={() => {
        return (
          <div
            class="relative"
            data-block-menu-trigger
            data-menu
            onPointerLeave={() => {
              if (!props.menuOpened) {
                setVisible(false);
              }
            }}
          >
            <div
              class="absolute -left-2 top-0 w-2 pointer-events-auto"
              style={{ height: `${hoverAreaHeight()}px` }}
            />
            <div
              class="absolute left-0 top-7 w-full pointer-events-auto"
              style={{ height: `${Math.max(0, hoverAreaHeight() - 28)}px` }}
            />
            <IconButton
              icon="i-lucide:ellipsis"
              variant="outlined"
              color="contrast"
              size="small"
              text="soft"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();

                if (!props.editor) {
                  return;
                }

                const { state } = props.editor;
                const node = state.doc.nodeAt(currentNodePos);

                if (node && currentNodePos >= 0) {
                  props.editor
                    .chain()
                    .focus()
                    .setBlockSelection({
                      from: currentNodePos,
                      to: currentNodePos + node.nodeSize
                    })
                    .run();
                }

                setVisible(true);
                props.setMenuOpened(true);
              }}
            />
          </div>
        );
      }}
      class="absolute z-10"
      style={{
        left: `${coords().left}px`,
        position: "absolute",
        top: `${coords().top}px`,
        visibility: visible() ? "visible" : "hidden"
      }}
      opened={props.menuOpened}
      setOpened={handleOpenedChange}
      cardProps={{
        class: "w-48"
      }}
      items={[
        {
          label: "Copy",
          icon: "i-lucide:copy",
          onClick: handleCopy,
          shortcut: "$mod+c"
        },
        {
          label: "Delete",
          icon: "i-lucide:trash",
          onClick: handleDelete,
          color: "danger",
          shortcut: "$mod+backspace"
        }
      ]}
    />
  );
};

export { BlockMenuArea, BlockMenu, BlockMenuContext };
