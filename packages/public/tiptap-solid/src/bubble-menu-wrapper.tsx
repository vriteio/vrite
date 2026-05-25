import { createRef } from "./ref";
import {
  BubbleMenuPlugin,
  BubbleMenuPluginProps,
} from "@tiptap/extension-bubble-menu";
import { Component, JSX, onMount } from "solid-js";
import { nanoid } from "nanoid";

type BubbleMenuWrapperProps = Omit<
  BubbleMenuPluginProps,
  "element" | "pluginKey" | "shouldShow"
> & {
  class?: string;
  children?: JSX.Element;
  shouldShow?: BubbleMenuPluginProps["shouldShow"];
};

const BubbleMenuWrapper: Component<BubbleMenuWrapperProps> = (props) => {
  const [getContainer, setContainer] = createRef<HTMLDivElement>();
  const pluginKey = nanoid();

  onMount(() => {
    const { editor, shouldShow, tippyOptions } = props;
    const container = getContainer();

    if (container) {
      editor.registerPlugin(
        BubbleMenuPlugin({
          editor,
          pluginKey,
          shouldShow: (props) => {
            if (shouldShow) {
              return shouldShow(props);
            }

            return false;
          },
          element: container,
          tippyOptions,
        })
      );
    }
  });

  return (
    <div
      ref={setContainer}
      class={props.class}
      style={{ visibility: "hidden" }}
    >
      {props.children}
    </div>
  );
};

export { BubbleMenuWrapper };
export type { BubbleMenuWrapperProps };
