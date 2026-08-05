import { FormatMenu, type BubbleMenuMode } from "./format";
import { LinkMenu } from "./link";
import { type Component, createEffect, createSignal, Match, on, Switch } from "solid-js";
import { type Editor } from "@tiptap/core";

interface BubbleMenuProps {
  editor: Editor;
  opened: boolean;
  class?: string;
}

const BubbleMenu: Component<BubbleMenuProps> = (props) => {
  const [mode, setMode] = createSignal<BubbleMenuMode>("format");

  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (!opened) {
          setTimeout(() => setMode("format"), 300);
        }
      }
    )
  );

  return (
    <Switch>
      <Match when={mode() === "link"}>
        <LinkMenu editor={props.editor} setMode={setMode} class={props.class} />
      </Match>
      <Match when={mode() === "format"}>
        <FormatMenu editor={props.editor} setMode={setMode} class={props.class} />
      </Match>
    </Switch>
  );
};

export { BubbleMenu };
export type { BubbleMenuMode };
