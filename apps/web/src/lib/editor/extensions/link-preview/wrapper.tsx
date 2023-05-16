import { LinkPreviewPlugin, LinkPreviewOptions } from "./plugin";
import { Accessor, Component, createSignal, JSX, onMount } from "solid-js";
import { createRef } from "#lib/utils";

type LinkPreviewWrapperProps = Omit<LinkPreviewOptions, "element"> & {
  class?: string;
  children: (link: Accessor<string>) => JSX.Element;
};

const LinkPreviewWrapper: Component<LinkPreviewWrapperProps> = (props) => {
  const [getContainer, setContainer] = createRef<HTMLDivElement | null>(null);
  const [getLink, setLink] = createSignal("");

  onMount(() => {
    const { editor } = props;
    const container = getContainer();

    if (container) {
      editor.registerPlugin(
        LinkPreviewPlugin(
          {
            editor,
            element: container
          },
          setLink
        )
      );
    }
  });

  return (
    <div ref={setContainer} class={props.class || ""} style={{ visibility: "hidden" }}>
      {props.children(getLink)}
    </div>
  );
};

export { LinkPreviewWrapper };
export type { LinkPreviewWrapperProps };
