import {
  mdiCheck,
  mdiChevronLeft,
  mdiCubeOutline,
  mdiDotsVertical,
  mdiNumeric,
  mdiTrashCanOutline,
  mdiXml
} from "@mdi/js";
import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Node as PMNode } from "@tiptap/pm/model";
import { Range } from "@tiptap/core";
import { Dynamic } from "solid-js/web";
import { Dropdown, Tooltip, IconButton, Input } from "#components/primitives";

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

type OptionMenu = Component<{ state: OptionProps; close(): void; goBack(): void }>;

interface NodeOption {
  color?: "danger" | "success";
  show?: (props: OptionProps) => boolean;
  icon: string | ((props: OptionProps) => string);
  label: string | ((props: OptionProps) => string);
  menu?: OptionMenu;
  onClick?(props: OptionProps): void;
}

const showCustomElementOption = (props: OptionProps): boolean => {
  const element = props.editor.view.nodeDOM(props.pos);

  if (element instanceof HTMLElement) {
    const uid = element.getAttribute("data-uid") || "";

    return Boolean(uid);
  }

  return false;
};
const removeBlockOption: NodeOption = {
  color: "danger",
  icon: mdiTrashCanOutline,
  label: "Remove block",
  onClick(props) {
    props.editor.commands.deleteRange({
      from: props.pos,
      to: props.pos + props.node.nodeSize
    });
  }
};
const options: Record<string, NodeOption[]> = {
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
      ...removeBlockOption,
      show: showCustomElementOption
    }
  ],
  codeBlock: [
    {
      icon: mdiNumeric,
      label: "Set start line",
      menu: (props) => {
        const [startLine, setStartLine] = createSignal<number>(
          props.state.node.attrs.startLine || 1
        );
        const saveStartLine = (): void => {
          props.state.editor.commands.updateAttributes("codeBlock", {
            startLine: startLine()
          });
          props.close();
        };

        return (
          <div class="flex flex-col items-start gap-0.5">
            <div class="flex justify-center items-center">
              <IconButton
                path={mdiChevronLeft}
                size="small"
                class="m-0"
                variant="text"
                text="soft"
                label="Start line"
                onClick={props.goBack}
                color="contrast"
              />
            </div>
            <div class="flex gap-1 text-base">
              <Input
                class="max-w-24 w-24 m-0"
                wrapperClass="m-0"
                type="number"
                min={1}
                max={9999}
                onEnter={(event) => {
                  event.preventDefault();
                  saveStartLine();
                }}
                value={`${startLine()}`}
                setValue={(value) => {
                  let parsedValue = parseInt(`${value || 1}`);

                  if (!parsedValue || isNaN(parsedValue)) {
                    parsedValue = 1;
                  }

                  parsedValue = Math.min(Math.max(parsedValue, 1), 9999);
                  setStartLine(parsedValue);
                }}
              />
              <IconButton path={mdiCheck} class="m-0" color="primary" onClick={saveStartLine} />
            </div>
          </div>
        );
      }
    },
    removeBlockOption
  ]
};
const OptionsDropdown: Component<OptionsDropdownProps> = (props) => {
  const [opened, setOpened] = createSignal(false);
  const [activeMenu, setActiveMenu] = createSignal<OptionMenu | null>(null);
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
  createEffect(() => {
    if (!opened()) {
      setActiveMenu(() => null);
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
          <Show
            when={activeMenu()}
            fallback={
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
                        if (option.menu) {
                          setActiveMenu(() => option.menu || null);

                          return;
                        }

                        option.onClick?.(props);
                        setOpened(false);
                      }}
                    />
                  );
                }}
              </For>
            }
          >
            <Dynamic
              component={activeMenu()!}
              state={props}
              close={() => {
                setOpened(false);
              }}
              goBack={() => {
                setActiveMenu(() => null);
              }}
            />
          </Show>
        </div>
      </Dropdown>
    </Show>
  );
};

export { OptionsDropdown };
