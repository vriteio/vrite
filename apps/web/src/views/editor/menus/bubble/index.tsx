import { LinkMenu } from "./link";
import { FormatMenu } from "./format";
import { TableMenu } from "./table";
import { BlockMenu } from "./block";
import { SelectMenu } from "./select";
import { SolidEditor } from "@vrite/tiptap-solid";
import { CellSelection } from "@tiptap/pm/tables";
import { Component, createEffect, createSignal, Match, on, Switch } from "solid-js";
import { NodeSelection } from "@tiptap/pm/state";
import { Ref } from "#lib/utils";

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
    <Switch>
      <Match when={mode() === "block"}>
        <BlockMenu
          editor={props.editor}
          mode={mode()}
          opened={props.opened}
          setMode={setMode}
          setBlockMenuOpened={props.setBlockMenuOpened}
          blur={props.blur}
          class={props.class}
        />
      </Match>
      <Match when={mode() === "table"}>
        <TableMenu
          editor={props.editor}
          mode={mode()}
          opened={props.opened}
          setMode={setMode}
          class={props.class}
        />
      </Match>
      <Match when={mode() === "format"}>
        <FormatMenu
          editor={props.editor}
          mode={mode()}
          opened={props.opened}
          setMode={setMode}
          class={props.class}
          blur={props.blur}
        />
      </Match>
      <Match when={mode() === "link"}>
        <LinkMenu
          editor={props.editor}
          mode={mode()}
          opened={props.opened}
          setMode={setMode}
          class={props.class}
        />
      </Match>
      <Match when={mode() === "select"}>
        <SelectMenu
          editor={props.editor}
          mode={mode()}
          opened={props.opened}
          setMode={setMode}
          class={props.class}
        />
      </Match>
    </Switch>
  );
};

export { BubbleMenu };
