import { mdiCubeOutline, mdiDotsVertical, mdiTrashCanOutline, mdiXml } from "@mdi/js";
import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Node as PMNode } from "@tiptap/pm/model";
import { Range } from "@tiptap/core";
import { Dropdown, Tooltip, IconButton } from "#components/primitives";

interface OptionsDropdownProps {
  editor: SolidEditor;
  range: Range;
  node: PMNode;
  pos: number;
  onReplaceContent(callback: () => void): void;
}
interface OptionProps {
  editor: SolidEditor;
  range: Range;
  node: PMNode;
  pos: number;
}

const showCustomElementOption = (props: OptionProps): boolean => {
  const element = props.editor.view.nodeDOM(props.pos);

  if (element instanceof HTMLElement) {
    const uid = element.getAttribute("data-uid") || "";

    return Boolean(uid);
  }

  return false;
};
const options: Record<
  string,
  Array<{
    color?: "danger" | "success";
    show?: (props: OptionProps) => boolean;
    icon: string | ((props: OptionProps) => string);
    label: string | ((props: OptionProps) => string);
    onClick(props: OptionProps): void;
  }>
> = {
  element: [
    {
      icon: (props) => {
        const element = props.editor.view.nodeDOM(props.pos) as HTMLElement;
        const customView = element.getAttribute("data-custom-view") === "true";

        return customView ? mdiXml : mdiCubeOutline;
      },
      show: showCustomElementOption,
      label: (props) => {
        const element = props.editor.view.nodeDOM(props.pos) as HTMLElement;
        const customView = element.getAttribute("data-custom-view") === "true";

        return customView ? "Raw view" : "Custom view";
      },
      onClick(props) {
        props.editor
          .chain()
          .command(({ tr, dispatch }) => {
            if (!dispatch) return false;

            if (typeof props.pos !== "number" || props.pos > props.editor.state.doc.nodeSize) {
              return false;
            }

            const element = props.editor.view.nodeDOM(props.pos) as HTMLElement;
            const uid = element?.getAttribute("data-uid") || "";

            if (props.node && props.node.type.name === "element") {
              tr.setMeta("addToHistory", false).setMeta("elementViewTypeData", {
                uid,
                view: "raw",
                pos: props.pos,
                node: props.node
              });
            }

            return true;
          })
          .setElementSelection(props.pos)
          .run();
      }
    },
    {
      color: "danger",
      icon: mdiTrashCanOutline,
      label: "Remove element",
      onClick(props) {
        props.editor.commands.deleteRange({
          from: props.pos,
          to: props.pos + props.node.nodeSize
        });
      },
      show: showCustomElementOption
    }
  ]
};
const OptionsDropdown: Component<OptionsDropdownProps> = (props) => {
  const [opened, setOpened] = createSignal(false);
  const availableOptions = createMemo(() => {
    opened();

    return (
      options[props.node.type.name]?.filter((option) => {
        return !option.show || option.show(props);
      }) || []
    );
  });

  createEffect(() => {
    if (!availableOptions().length) {
      setOpened(false);
    }
  });

  return (
    <Show when={availableOptions().length}>
      <Dropdown
        placement="left-start"
        cardProps={{ class: "m-0 -ml-1 p-2" }}
        overlay={false}
        opened={opened()}
        setOpened={setOpened}
        activatorButton={(buttonProps) => {
          props.onReplaceContent(() => {
            buttonProps.computeDropdownPosition();
          });

          return (
            <Tooltip text="Options" side="left" class="-ml-1">
              <IconButton class="m-0" path={mdiDotsVertical} text="soft" />
            </Tooltip>
          );
        }}
      >
        <div class="flex flex-col gap-1">
          <For each={availableOptions()}>
            {(option) => {
              const path = (): string => {
                if (!opened()) return "";

                return typeof option.icon === "function" ? option.icon(props) : option.icon;
              };
              const label = (): string => {
                if (!opened()) return "";

                return typeof option.label === "function" ? option.label(props) : option.label;
              };

              return (
                <IconButton
                  class="m-0 w-full justify-start"
                  text={option.color || "soft"}
                  color={option.color || "base"}
                  variant="text"
                  path={path()}
                  label={label()}
                  onClick={() => {
                    option.onClick(props);
                    setOpened(false);
                  }}
                />
              );
            }}
          </For>
        </div>
      </Dropdown>
    </Show>
  );
};

export { OptionsDropdown };
