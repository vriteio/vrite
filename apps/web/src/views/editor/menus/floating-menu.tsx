import { SolidEditor } from "@vrite/tiptap-solid";
import { Component, createSignal } from "solid-js";
import { mdiSlashForward } from "@mdi/js";
import { IconButton, Tooltip } from "#components/primitives";

interface BubbleMenuProps {
  editor: SolidEditor;
  opened: boolean;
}

const FloatingMenu: Component<BubbleMenuProps> = (props) => {
  const [visible, setVisible] = createSignal(false);

  return (
    <Tooltip
      wrapperClass="absolute m-0 transform -translate-y-1/2 top-1/2 right-3.5"
      visible={visible()}
      setVisible={setVisible}
      side="right"
      text="Open menu"
    >
      <IconButton
        onClick={() => {
          setVisible(false);
          props.editor.chain().insertContent("/").focus().run();
        }}
        class="h-8 w-8 bg-gray-50 border-2 border-gray-200 hover:border-gray-300 dark:border-gray-900 hover:dark:border-gray-700"
        path={mdiSlashForward}
        text="soft"
      />
    </Tooltip>
  );
};

export { FloatingMenu };
