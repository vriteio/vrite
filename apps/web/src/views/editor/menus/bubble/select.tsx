import { mdiPlus, mdiKeyboardCloseOutline } from "@mdi/js";
import clsx from "clsx";
import { Component } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Card, Select } from "#components/primitives";

const SelectMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  blur?(): void;
  setMode(mode: string): void;
  setBlockMenuOpened?(opened: boolean): void;
}> = (props) => {
  const lists: Record<string, { listType: string; itemType: string }> = {
    bulletList: {
      listType: "bulletList",
      itemType: "listItem"
    },
    orderedList: {
      listType: "orderedList",
      itemType: "listItem"
    },
    taskList: {
      listType: "taskList",
      itemType: "taskItem"
    }
  };
  const listOptions = [
    {
      label: "Bullet List",
      value: "bulletList"
    },
    {
      label: "Ordered List",
      value: "orderedList"
    },
    {
      label: "Task List",
      value: "taskList"
    }
  ];

  console.log(props.editor.state.selection, props.editor.state.selection.$from.parent.type.name);

  return (
    <Card
      class={clsx(
        "relative flex p-0 m-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
        props.class
      )}
    >
      <Select
        options={listOptions}
        value={props.editor.state.selection.$from.nodeAfter?.type.name}
        setValue={(value) => {
          props.editor
            .chain()
            .focus()
            .toggleList(lists[value].listType, lists[value].itemType)
            .run();
        }}
        placeholder="Select Type"
        class="bg-transparent m-0"
      />
    </Card>
  );
};

export { SelectMenu };
