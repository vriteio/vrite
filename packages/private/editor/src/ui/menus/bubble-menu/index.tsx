import { FormatMenu } from "./format";
import { SolidEditor } from "@andesine/tiptap-solid";
import { CellSelection } from "@tiptap/pm/tables";
import { Component, createEffect, createSignal, on } from "solid-js";
import { NodeSelection } from "@tiptap/pm/state";
import { Ref } from "@andesine/components/ref";

type BubbleMenuMode = "format" | "link" | "table" | "block" | "select";
interface BubbleMenuProps {
  editor: SolidEditor;
  opened: boolean;
  class?: string;
  mode?: BubbleMenuMode;
  ref?: Ref<HTMLElement>[1];
  blur?(): void;
  setBlockMenuOpened?(opened: boolean): void;
}

const BubbleMenu: Component<BubbleMenuProps> = (props) => {
  const [mode, setMode] = createSignal<BubbleMenuMode>("format");

  props.editor.on("selectionUpdate", () => {
    if (props.editor.state.selection instanceof CellSelection) {
      setMode("table");
    } else if (props.editor.state.selection instanceof NodeSelection) {
      setMode("select");
    } else if (!props.editor.state.selection.empty) {
      setMode("format");
    }
  });
  createEffect(
    on(
      () => props.mode,
      (mode) => {
        setMode((currentMode) => mode || currentMode);
      }
    )
  );
  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (!opened) {
          setTimeout(() => {
            setMode("format");
          }, 300);
        }
      }
    )
  );
  return (
    <FormatMenu
      editor={props.editor}
      mode={mode()}
      opened={props.opened}
      setMode={setMode}
      class={props.class}
      blur={props.blur}
    />
  );
};

export { BubbleMenu };
export type { BubbleMenuMode };
