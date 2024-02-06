import clsx from "clsx";
import { Component, Match, Switch, createSignal, onCleanup } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { debounce } from "@solid-primitives/scheduled";
import { Card, Select } from "#components/primitives";
import { App, useAuthenticatedUserData } from "#context";

const SelectMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  blur?(): void;
  setMode(mode: string): void;
  setBlockMenuOpened?(opened: boolean): void;
}> = (props) => {
  const { workspaceSettings = () => null } = useAuthenticatedUserData() || {};
  const [currentNodeType, setCurrentNodeType] = createSignal("");
  const [optionsMode, setOptionsMode] = createSignal("");
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
  ].filter((option) => {
    const enabledBlocks = workspaceSettings()?.blocks;

    if (!enabledBlocks) return true;

    return enabledBlocks.includes(option.value as App.WorkspaceSettings["blocks"][number]);
  });
  const textOptions = [
    {
      label: "Paragraph",
      value: "paragraph",
      attrs: {}
    },
    ...[1, 2, 3, 4, 5, 6]
      .map((level) => ({
        label: `Heading ${level}`,
        value: `heading:${level}`,
        attrs: {
          level
        }
      }))
      .filter((option) => {
        const enabledBlocks = workspaceSettings()?.blocks;

        if (!enabledBlocks) return true;

        return enabledBlocks.includes(
          option.value.replace(":", "") as App.WorkspaceSettings["blocks"][number]
        );
      })
  ];
  const handleSelectionUpdate = (): void => {
    const node = props.editor.state.selection.$from.nodeAfter;
    const currentNodeType = `${node?.type.name || ""}${
      node?.attrs.level ? `:${node?.attrs.level}` : ""
    }`;
    const textOption = textOptions.find((option) => {
      return option.value === currentNodeType;
    });
    const listOption = listOptions.find((option) => {
      return option.value === currentNodeType;
    });

    if (textOption) setOptionsMode("text");
    if (listOption) setOptionsMode("list");

    if (textOption || listOption) {
      setCurrentNodeType(currentNodeType);
    } else {
      setCurrentNodeType("");
      setOptionsMode("");
      props.setBlockMenuOpened?.(false);
    }
  };
  const debouncedHandleSelectionUpdate = debounce(handleSelectionUpdate, 250);

  props.editor.on("selectionUpdate", debouncedHandleSelectionUpdate);
  onCleanup(() => {
    props.editor.off("selectionUpdate", debouncedHandleSelectionUpdate);
  });
  handleSelectionUpdate();

  return (
    <Card
      class={clsx(
        "relative flex p-0 m-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose rounded-xl",
        props.class
      )}
    >
      <Switch>
        <Match when={optionsMode() === "list"}>
          <Select
            options={listOptions}
            value={currentNodeType()}
            setValue={(value) => {
              const listNode = props.editor.state.selection.$from.nodeAfter;
              const json = listNode?.toJSON();

              json.type = lists[value].listType;
              json.content.forEach((item: any) => {
                item.type = lists[value].itemType;
              });
              props.editor
                .chain()
                .deleteSelection()
                .insertContentAt(props.editor.state.selection.$from.pos, json)
                .setNodeSelection(props.editor.state.selection.$from.pos)
                .run();
              handleSelectionUpdate();
            }}
            placeholder="Select Type"
            class="!bg-transparent m-0"
          />
        </Match>
        <Match when={optionsMode() === "text"}>
          <Select
            options={textOptions}
            value={currentNodeType()}
            setValue={(value) => {
              const option = textOptions.find((option) => {
                return option.value === value;
              });
              const textNode = props.editor.state.selection.$from.nodeAfter;

              if (!option || !textNode) return;

              const json = textNode?.toJSON();

              json.type = option.value.split(":")[0] || "paragraph";
              json.attrs = option.attrs;
              props.editor
                .chain()
                .deleteSelection()
                .insertContentAt(props.editor.state.selection.$from.pos, json)
                .setNodeSelection(props.editor.state.selection.$from.pos)
                .run();
              handleSelectionUpdate();
            }}
            placeholder="Select Type"
            class="!bg-transparent m-0"
          />
        </Match>
      </Switch>
    </Card>
  );
};

export { SelectMenu };
