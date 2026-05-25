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
}
interface BlockMenuProps {
  editor: Editor | null;
}

const BlockMenuContext = createContext<{
  handleCopy(): boolean;
  handleDelete(): boolean;
  openMenu(): void;
}>({
  handleCopy: () => false,
  handleDelete: () => false,
  openMenu: () => {}
});
const BlockMenuArea: ParentComponent<BlockMenuAreaProps> = (props) => {
  const registerShortcuts = useShortcuts();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const handleCopy = () => {
    if (!props.editor) return false;

    const { dom, text } = props.editor.view.serializeForClipboard(
      props.editor.state.selection.content()
    );

    navigator.clipboard.write([
      new ClipboardItem({
        "text/plain": new Blob([text], { type: "text/plain" }),
        "text/html": new Blob([dom.innerHTML], { type: "text/html" })
      })
    ]);

    return true;
  };
  const handleDelete = () => {
    if (!props.editor) return false;

    props.editor.chain().focus().deleteSelection().run();

    return true;
  };
  const openMenu = () => {
    setMenuOpened(true);
  };

  createEffect(() => {
    registerShortcuts({
      "$mod+backspace": handleDelete,
      "$mod+c": handleCopy
    });
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
        <BlockMenu editor={props.editor} menuOpened={menuOpened()} setMenuOpened={setMenuOpened} />
      </DropdownArea>
    </BlockMenuContext.Provider>
  );
};
const BlockMenu: ParentComponent<
  BlockMenuProps & { menuOpened: boolean; setMenuOpened(opened: boolean): void }
> = (props) => {
  const { handleCopy, handleDelete } = useContext(BlockMenuContext);
  const [coords, setCoords] = createSignal({ top: 0, right: 0 });
  const [visible, setVisible] = createSignal(false);
  const [focused, setFocused] = createSignal(false);

  createEffect(() => {
    const editor = props.editor;

    if (!editor) {
      setVisible(false);
      return;
    }

    const updatePosition = () => {
      const { state, view } = editor;
      const { selection } = state;

      try {
        const $from = selection.$from;

        if ($from.depth < 1) {
          setVisible(false);

          return;
        }

        let targetPos = $from.before(1);

        if (isBlockSelection(selection)) {
          const { from } = selection;
          let firstBlockPos: number | null = null;

          state.doc.nodesBetween(from, selection.to, (node, pos) => {
            if (firstBlockPos === null && node.type.isInGroup("block")) {
              firstBlockPos = pos;

              return false;
            }

            return firstBlockPos === null;
          });

          if (firstBlockPos !== null) {
            targetPos = firstBlockPos;
          }
        }

        const dom = view.nodeDOM(targetPos);

        if (dom instanceof HTMLElement) {
          const blockRect = dom.getBoundingClientRect();

          setCoords({
            top: blockRect.top,
            right: window.innerWidth - blockRect.right
          });
          setVisible(true);
        } else {
          setVisible(false);
        }
      } catch {
        setVisible(false);
      }
    };

    const scrollContainer = editor.view.dom
      .closest("#editor-container")
      ?.closest(".overflow-auto") as HTMLElement | null;

    editor.on("selectionUpdate", updatePosition);
    editor.on("update", updatePosition);
    editor.on("focus", () => {
      setFocused(true);
      updatePosition();
    });
    editor.on("blur", () => {
      setFocused(false);
      updatePosition();
    });
    scrollContainer?.addEventListener("scroll", updatePosition, { passive: true });
    updatePosition();

    onCleanup(() => {
      editor.off("selectionUpdate", updatePosition);
      editor.off("update", updatePosition);
      scrollContainer?.removeEventListener("scroll", updatePosition);
    });
  });

  return (
    <DropdownMenu
      trigger={() => {
        return (
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
              const { selection } = state;

              if (!isBlockSelection(selection)) {
                const $from = selection.$from;
                const pos = $from.before(1);
                const node = state.doc.nodeAt(pos);

                if (node) {
                  props.editor
                    .chain()
                    .focus()
                    .setBlockSelection({
                      from: pos,
                      to: pos + node.nodeSize
                    })
                    .run();
                }
              } else {
                props.editor.commands.focus();
              }

              props.setMenuOpened(true);
            }}
          />
        );
      }}
      class="fixed z-10"
      style={{
        right: `${coords().right}px`,
        top: `${coords().top}px`
      }}
      opened={props.menuOpened}
      setOpened={props.setMenuOpened}
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
