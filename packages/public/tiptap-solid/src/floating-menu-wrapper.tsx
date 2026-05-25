import { createRef } from "./ref";
import { Component, JSX, onMount } from "solid-js";
import { FloatingMenuPlugin, FloatingMenuPluginProps } from "@tiptap/extension-floating-menu";
import { nanoid } from "nanoid";

type FloatingMenuWrapperProps = Omit<
  FloatingMenuPluginProps,
  "element" | "pluginKey" | "shouldShow"
> & {
  class?: string;
  shouldShow?: FloatingMenuPluginProps["shouldShow"];
  children?: JSX.Element;
};

const FloatingMenuWrapper: Component<FloatingMenuWrapperProps> = (props) => {
  const [getContainer, setContainer] = createRef<HTMLDivElement>();
  const pluginKey = nanoid();

  onMount(() => {
    const { editor, shouldShow, tippyOptions } = props;
    const container = getContainer();

    if (container) {
      editor.registerPlugin(
        FloatingMenuPlugin({
          editor,
          pluginKey,
          shouldShow: shouldShow || null,
          element: container,
          tippyOptions
        })
      );
    }
  });

  return (
    <div ref={setContainer} class={props.class} style={{ visibility: "hidden" }}>
      {props.children}
    </div>
  );
};

export { FloatingMenuWrapper };
export type { FloatingMenuWrapperProps };
