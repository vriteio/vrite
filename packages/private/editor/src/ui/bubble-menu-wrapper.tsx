import type { BubbleMenuPluginProps } from "@tiptap/extension-bubble-menu";
import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
import { createSignal, onCleanup, onMount, type ParentComponent } from "solid-js";

interface BubbleMenuWrapperProps {
  pluginKey?: BubbleMenuPluginProps["pluginKey"];
  editor: BubbleMenuPluginProps["editor"];
  updateDelay?: BubbleMenuPluginProps["updateDelay"];
  resizeDelay?: BubbleMenuPluginProps["resizeDelay"];
  options?: BubbleMenuPluginProps["options"];
  appendTo?: BubbleMenuPluginProps["appendTo"];
  shouldShow?: Exclude<Required<BubbleMenuPluginProps>["shouldShow"], null>;
  getReferencedVirtualElement?: BubbleMenuPluginProps["getReferencedVirtualElement"];
  zIndex?: number;
}

const BubbleMenuWrapper: ParentComponent<BubbleMenuWrapperProps> = (props) => {
  const [wrapperRef, setWrapperRef] = createSignal<HTMLElement | null>(null);
  const pluginKey = () => props.pluginKey || "bubbleMenu";

  onMount(() => {
    const wrapper = wrapperRef();

    if (!wrapper) {
      return;
    }

    wrapper.style.visibility = "hidden";
    wrapper.style.position = "absolute";
    wrapper.style.pointerEvents = "auto";
    wrapper.style.zIndex = `${props.zIndex || 0}`;

    // Remove element from DOM; plugin will re-parent it when shown
    wrapper.remove();
    props.editor.registerPlugin(
      BubbleMenuPlugin({
        pluginKey: pluginKey(),
        element: wrapper,
        editor: props.editor,
        options: props.options,
        resizeDelay: props.resizeDelay,
        appendTo: props.appendTo,
        shouldShow: props.shouldShow,
        getReferencedVirtualElement: props.getReferencedVirtualElement,
        updateDelay: props.updateDelay
      })
    );
    onCleanup(() => {
      props.editor.unregisterPlugin(pluginKey());
    });
  });

  return <div ref={setWrapperRef}>{props.children}</div>;
};

export { BubbleMenuWrapper };
