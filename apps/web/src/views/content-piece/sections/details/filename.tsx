import { mdiFileOutline } from "@mdi/js";
import { Component, Show } from "solid-js";
import { Tooltip, IconButton, Input } from "#components/primitives";

interface PathInputProps {
  filename: string;
  editable?: boolean;
  setFilename(filename: string): void;
}

const FilenameInput: Component<PathInputProps> = (props) => {
  return (
    <div class="flex w-full">
      <Tooltip side="right" text="Filename" enabled={props.editable !== false}>
        <IconButton
          path={mdiFileOutline}
          variant="text"
          badge={props.editable === false}
          hover={props.editable !== false}
          disabled={props.editable === false}
          class="ml-0"
        />
      </Tooltip>
      <Show when={typeof props.filename === "string"}>
        <Input
          value={props.filename || ""}
          placeholder="example.md"
          wrapperClass="max-w-72 w-full"
          disabled={props.editable === false}
          color="base"
          onChange={(event) => {
            const { value } = event.currentTarget;

            props.setFilename(value);
          }}
        />
      </Show>
    </div>
  );
};

export { FilenameInput };
