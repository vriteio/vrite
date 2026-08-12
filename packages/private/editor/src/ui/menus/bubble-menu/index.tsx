import { FormatMenu, type BubbleMenuMode } from "./format";
import { LinkMenu } from "./link";
import {
  type Accessor,
  type Component,
  createEffect,
  createSignal,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch
} from "solid-js";
import { type Editor, isTextSelection } from "@tiptap/core";
import { BubbleMenuPlugin } from "@tiptap/extension-bubble-menu";
import { Portal } from "solid-js/web";
import { isBlockSelection } from "#editor/extensions";
import { EDITOR_MENU_Z_INDEX } from "#editor/ui/constants";
import { useBlockMenuContext } from "#editor/ui/menus/block-menu";

interface BubbleMenuProps {
  editor: Editor;
  menuContainerRef: Accessor<HTMLElement | null>;
}

const BubbleMenu: Component<BubbleMenuProps> = (props) => {
  const { setTextMenuSelectionRange } = useBlockMenuContext();
  const [wrapper, setWrapper] = createSignal<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(false);
  const [mode, setMode] = createSignal<BubbleMenuMode>("format");
  const updateTextMenuSelectionRange = () => {
    const selection = props.editor.state.selection;

    if (isTextSelection(selection) && !selection.empty) {
      setTextMenuSelectionRange({ from: selection.from, to: selection.to });
    }
  };
  const handleShow = () => {
    setOpened(true);
    updateTextMenuSelectionRange();
  };
  const handleHide = () => {
    setOpened(false);
    setTextMenuSelectionRange(null);
  };

  createEffect(
    on(opened, (opened) => {
      if (!opened) {
        setTimeout(() => setMode("format"), 300);
      }
    })
  );

  onMount(() => {
    const wrapper = document.createElement("div");

    wrapper.setAttribute("data-text-menu", "true");
    wrapper.style.visibility = "hidden";
    wrapper.style.position = "absolute";
    wrapper.style.pointerEvents = "auto";
    wrapper.style.zIndex = String(EDITOR_MENU_Z_INDEX.bubbleMenu);
    setWrapper(wrapper);
    props.editor.registerPlugin(
      BubbleMenuPlugin({
        pluginKey: "bubbleMenu",
        element: wrapper,
        editor: props.editor,
        appendTo: () => props.menuContainerRef()!,
        options: {
          onHide: handleHide,
          onShow: handleShow,
          onUpdate: updateTextMenuSelectionRange
        },
        shouldShow: ({ editor }) => {
          const { selection } = editor.state;
          const isTitleSelection = selection.$from.parent.type.name === "title";
          const shouldShow =
            !isTitleSelection &&
            !isBlockSelection(selection) &&
            isTextSelection(selection) &&
            !selection.empty;

          setOpened(shouldShow);

          return shouldShow;
        }
      })
    );
  });
  onCleanup(() => {
    setWrapper(null);
    setTextMenuSelectionRange(null);
    props.editor.unregisterPlugin("bubbleMenu");
  });

  return (
    <Show when={wrapper()}>
      <Portal mount={wrapper()!}>
        <Switch>
          <Match when={mode() === "link"}>
            <LinkMenu editor={props.editor} opened={opened()} setMode={setMode} />
          </Match>
          <Match when={mode() === "format"}>
            <FormatMenu editor={props.editor} opened={opened()} setMode={setMode} />
          </Match>
        </Switch>
      </Portal>
    </Show>
  );
};

export { BubbleMenu };
export type { BubbleMenuMode };
