import { EmbedAttributes } from "./node";
import { SolidNodeViewProps, Attrs } from "@vrite/tiptap-solid";
import { Component } from "solid-js";
import { Card, Input } from "#components/primitives";
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
    <div class="pointer-events-auto flex bg-gray-50 dark:bg-gray-900 !md:bg-transparent border-gray-200 dark:border-gray-700 border-y-2 md:border-0 backdrop-blur-sm md:gap-2 w-screen md:flex-1 !md:left-unset relative md:rounded-2xl">
      <Card class="flex m-0 border-0 md:border-2 px-1 py-1 md:py-0 rounded-xl overflow-hidden flex-1">
        <Input
          wrapperClass="w-full min-w-unset md:max-w-96 flex-1"
          class="w-full bg-transparent m-0 flex-1 text-lg"
          placeholder={getInputPlaceholder(attrs().embed as EmbedType)}
          value={attrs().input || ""}
          disabled={!props.state.editor.isEditable}
          setValue={(value) => {
            props.state.updateAttributes({ input: value, src: getSrc(value) });
          }}
        />
      </Card>
    </div>
  );
};

export { EmbedMenu };
