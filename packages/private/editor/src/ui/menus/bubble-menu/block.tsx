import clsx from "clsx";
import { Component } from "solid-js";
import { SolidEditor } from "@andesine/tiptap-solid";
import { Card, IconButton } from "@andesine/components";

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
        icon="i-lucide:plus"
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
        icon="i-lucide:keyboard-off"
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
