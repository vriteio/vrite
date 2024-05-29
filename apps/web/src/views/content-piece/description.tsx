import { mdiClose, mdiTextBoxPlusOutline } from "@mdi/js";
import { Component, Show } from "solid-js";
import { Tooltip, IconButton, Heading } from "#components/primitives";
import { MiniEditor } from "#components/fragments";

interface ContentPieceDescriptionProps {
  initialDescription: string;
  editable?: boolean;
  setDescription(description: string | null): void;
}

const ContentPieceDescription: Component<ContentPieceDescriptionProps> = (props) => {
  return (
    <div class="flex w-full">
      <MiniEditor
        class="prose narrow-prose text-gray-500 dark:text-gray-400"
        initialValue={props.initialDescription}
        placeholder="Description"
        inline
        blocks
        lists
        readOnly={props.editable === false}
        onBlur={(editor) => {
          props.setDescription(editor.getHTML());
        }}
      />
    </div>
  );
};

export { ContentPieceDescription };
