import { isBlockSelection } from "#editor/extensions";
import { DropdownArea, useShortcuts } from "@andesine/components";
import { type Editor, isTextSelection } from "@tiptap/core";
import {
  type Accessor,
  createEffect,
  createSignal,
  onCleanup,
  type ParentComponent,
  Show
} from "solid-js";
import { Portal } from "solid-js/web";
import { BlockMenu } from "./block-menu";
import { BlockMenuContext } from "./context";
import type { BlockControlRange } from "#editor/ui/block-control-targeting";

interface BlockMenuAreaProps {
  editor: Editor | null;
  menuContainerRef: Accessor<HTMLElement | null>;
  notify(type: "success" | "error", text: string): void;
  textMenuSelectionRange: BlockControlRange | null;
}

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
    const unregister = registerShortcuts(
      {
        "$mod+backspace": (event) => canHandleShortcut(event) && handleDelete(),
        "$mod+c": (event) => canHandleShortcut(event) && handleCopy()
      },
      {
        ignore: (event) => event.repeat || event.isComposing
      }
    );

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
        <Show when={props.menuContainerRef()} keyed>
          {(menuContainer) => (
            <Portal mount={menuContainer}>
              <BlockMenu
                anchorPoint={menuAnchorPoint()}
                editor={props.editor}
                menuOpened={menuOpened()}
                setMenuOpened={handleMenuOpenedChange}
                textMenuSelectionRange={props.textMenuSelectionRange}
              />
            </Portal>
          )}
        </Show>
      </DropdownArea>
    </BlockMenuContext.Provider>
  );
};

export { BlockMenuArea };
