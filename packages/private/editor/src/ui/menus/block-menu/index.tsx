import { isBlockSelection } from "#editor/extensions";
import { DropdownArea, DropdownMenu, IconButton, useShortcuts } from "@andesine/components";
import { SolidEditor } from "@andesine/tiptap-solid";
import { isTextSelection } from "@tiptap/core";
import {
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  ParentComponent,
  useContext
} from "solid-js";

interface BlockMenuAreaProps {
  editor: SolidEditor;
}
interface BlockMenuProps {
  editor: SolidEditor;
}

const BlockMenuContext = createContext({
  handleCopy: () => false as boolean,
  handleDelete: () => false as boolean
});
const BlockMenuArea: ParentComponent<BlockMenuAreaProps> = (props) => {
  const registerShortcuts = useShortcuts();
  const handleCopy = () => {
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
    props.editor.chain().focus().deleteSelection().run();

    return true;
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
        handleDelete
      }}
    >
      <DropdownArea
        enabled={(event) => {
          const { view, state } = props.editor;
          const { selection } = state;

          // If text is selected, don't show the menu
          if (!isBlockSelection(selection) && isTextSelection(selection) && !selection.empty) {
            return false;
          }

          // If context menu is activated within the editor, show the menu (block selection already exists or will be set)
          return view.dom.contains(event.target as Node);
        }}
      >
        {props.children}
      </DropdownArea>
    </BlockMenuContext.Provider>
  );
};
const BlockMenu: ParentComponent<BlockMenuProps> = (props) => {
  const { handleCopy, handleDelete } = useContext(BlockMenuContext);
  const [opened, setOpened] = createSignal(false);
  const [coords, setCoords] = createSignal({ left: 0, top: 0 });

  return (
    <DropdownMenu
      activatorButton={() => {
        return (
          <IconButton
            icon="i-lucide:ellipsis"
            variant="outlined"
            color="contrast"
            size="small"
            text="soft"
          />
        );
      }}
      class="absolute z-10"
      style={{
        left: `100%`,
        top: `${coords().top}px`
      }}
      opened={opened()}
      setOpened={setOpened}
      cardProps={{
        class: "w-48"
      }}
      options={[
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

export { BlockMenuArea, BlockMenu };
