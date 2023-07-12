import { EmbedAttributes } from "./node";
import { SolidNodeViewProps, Attrs } from "@vrite/tiptap-solid";
import { Component } from "solid-js";
import { mdiDotsGrid } from "@mdi/js";
import { IconButton, Input, Tooltip } from "#components/primitives";
import { EmbedType, getEmbedId, getEmbedSrc } from "#lib/utils";

interface ImageMenuProps {
  state: SolidNodeViewProps<Attrs>;
}

const getInputPlaceholder = (embedType?: EmbedType): string => {
  switch (embedType) {
    case "codepen":
      return "Pen ID or URL";
    case "youtube":
      return "Video ID or URL";
    case "codesandbox":
      return "Sandbox ID or URL";
    default:
      return "Embed URL";
  }
};
const EmbedMenu: Component<ImageMenuProps> = (props) => {
  const attrs = (): EmbedAttributes => props.state.node.attrs;
  const getSrc = (input: string): string => {
    return getEmbedSrc(
      getEmbedId(input, (attrs().embed as EmbedType) || "codepen"),
      (attrs().embed as EmbedType) || "codepen"
    );
  };

  return (
    <div class="flex p-0 transition-shadow duration-200 border-0 rounded-xl">
      <Input
        wrapperClass="flex-1 max-w-full"
        color="contrast"
        placeholder={getInputPlaceholder(attrs().embed as EmbedType)}
        value={attrs().input || ""}
        disabled={!props.state.editor.isEditable}
        setValue={(value) => {
          props.state.updateAttributes({ input: value, src: getSrc(value) });
        }}
      />
    </div>
  );
};

export { EmbedMenu };
