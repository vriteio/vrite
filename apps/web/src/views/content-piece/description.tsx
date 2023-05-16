import { mdiClose, mdiTextBoxPlusOutline } from "@mdi/js";
import { Component, Show } from "solid-js";
import { Tooltip, IconButton, Heading } from "#components/primitives";
import { MiniEditor } from "#components/fragments";

interface ContentPieceDescriptionProps {
  descriptionExists: boolean;
  initialDescription: string;
  editable?: boolean;
  setDescription(description: string | null): void;
}

const ContentPieceDescription: Component<ContentPieceDescriptionProps> = (props) => {
  return (
    <>
      <div class="flex items-center justify-center h-10">
        <Heading level={2} class="flex-1">
          Description
        </Heading>
        <Show when={props.descriptionExists && props.editable !== false}>
          <Tooltip text="Remove description" side="left">
            <IconButton
              path={mdiClose}
              color={"base"}
              text="soft"
              onClick={() => {
                props.setDescription(null);
              }}
            />
          </Tooltip>
        </Show>
      </div>
      <div class="flex">
        <Show
          when={props.descriptionExists}
          fallback={
            <IconButton
              label="Add description"
              class="w-full h-32 rounded-2xl"
              color={"base"}
              path={mdiTextBoxPlusOutline}
              text="soft"
              onClick={() => {
                props.setDescription("<p></p>");
              }}
            />
          }
        >
          <MiniEditor
            class="prose narrow-prose"
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
        </Show>
      </div>
    </>
  );
};

export { ContentPieceDescription };
