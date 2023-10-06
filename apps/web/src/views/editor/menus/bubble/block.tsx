import { mdiPlus, mdiKeyboardCloseOutline } from "@mdi/js";
import clsx from "clsx";
import { Component } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Card, IconButton } from "#components/primitives";

const BlockMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  blur?(): void;
  setMode(mode: string): void;
  setBlockMenuOpened?(opened: boolean): void;
}> = (props) => {
  return (
    <Card
      class={clsx(
        "relative flex p-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
        props.class
      )}
    >
      <IconButton
        path={mdiPlus}
        text="soft"
        variant="text"
        label="Insert block"
        onClick={(event) => {
          props.setBlockMenuOpened?.(true);
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <IconButton
        path={mdiKeyboardCloseOutline}
        text="soft"
        variant="text"
        onClick={(event) => {
          props.blur?.();
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    </Card>
  );
};

export { BlockMenu };
