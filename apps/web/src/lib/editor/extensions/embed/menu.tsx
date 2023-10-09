import { EmbedAttributes } from "./node";
import { SolidNodeViewProps, Attrs } from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, on } from "solid-js";
import { Card, Input } from "#components/primitives";
import { EmbedType, createRef, getEmbedId, getEmbedSrc } from "#lib/utils";

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
  const [menuRef, setMenuRef] = createRef<HTMLElement | null>(null);
  const [left, setLeft] = createSignal(0);
  const attrs = (): EmbedAttributes => props.state.node.attrs;
  const getSrc = (input: string): string => {
    return getEmbedSrc(
      getEmbedId(input, (attrs().embed as EmbedType) || "codepen"),
      (attrs().embed as EmbedType) || "codepen"
    );
  };

  createEffect(
    on(
      () => props.state.selected,
      () => {
        const element = menuRef();

        if (!element || !element.parentElement) return;

        const { left, width } = element.parentElement.getBoundingClientRect();
        const right = window.innerWidth - left - width;

        setLeft(-Math.abs((right - left) / 2));
      }
    )
  );

  return (
    <div
      class="pointer-events-auto flex bg-gray-50 dark:bg-gray-900 !md:bg-transparent border-gray-200 dark:border-gray-700 border-y-2 md:border-0 backdrop-blur-sm md:gap-2 w-screen md:w-auto !md:left-unset relative md:rounded-2xl"
      style={{ left: `${left()}px` }}
      ref={setMenuRef}
    >
      <Card class="flex m-0 border-0 md:border-2 p-1">
        <Input
          wrapperClass="max-w-full min-w-unset md:w-96 flex-1"
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
