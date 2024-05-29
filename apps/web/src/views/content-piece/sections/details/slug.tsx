import { mdiLink } from "@mdi/js";
import { Component, Show } from "solid-js";
import { convert as convertToSlug } from "url-slug";
import { Tooltip, IconButton, Input } from "#components/primitives";

interface SlugInputProps {
  slug: string;
  editable?: boolean;
  setSlug(slug: string): void;
}

const SlugInput: Component<SlugInputProps> = (props) => {
  return (
    <div class="flex w-full">
      <Tooltip side="right" text="Slug" enabled={props.editable !== false}>
        <IconButton
          path={mdiLink}
          variant="text"
          class="ml-0"
          badge={props.editable === false}
          hover={props.editable !== false}
          disabled={props.editable === false}
        />
      </Tooltip>
      <Show when={typeof props.slug === "string"}>
        <Input
          value={props.slug || ""}
          placeholder="Slug"
          wrapperClass="max-w-72 w-full"
          disabled={props.editable === false}
          color="base"
          onChange={(event) => {
            const { value } = event.currentTarget;

            props.setSlug(
              value
                .split("/")
                .map((slugPart) => convertToSlug(slugPart))
                .join("/")
            );
          }}
        />
      </Show>
    </div>
  );
};

export { SlugInput };
