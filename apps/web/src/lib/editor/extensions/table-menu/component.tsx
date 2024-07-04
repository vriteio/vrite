import {
  mdiKeyboardCloseOutline,
  mdiTableColumnPlusAfter,
  mdiTableColumnPlusBefore,
  mdiTableHeadersEye,
  mdiTableHeadersEyeOff,
  mdiTableRemove,
  mdiTableRowPlusAfter,
  mdiTableRowPlusBefore
} from "@mdi/js";
import { ChainedCommands } from "@tiptap/core";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Component, For, Show, createMemo } from "solid-js";
import clsx from "clsx";
import { Selection } from "@tiptap/pm/state";
import { Node } from "@tiptap/pm/model";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { breakpoints } from "#lib/utils";

interface TableMenuProps {
  state: {
    container: HTMLElement | null;
    editor: SolidEditor;
  };
}

const TableMenu: Component<TableMenuProps> = (props) => {
  const hasHeader = createMemo(() => {
    return props.state.container?.querySelector("tr:first-child > th") !== null;
  });
  const getTableNode = (selection: Selection): { node: Node; pos: number } | null => {
    for (let { depth } = selection.$from; depth > 0; depth--) {
      const node = selection.$from.node(depth);
      const pos = selection.$from.before(depth);

      if (node.type.name === "table") {
        return { node, pos };
      }
    }

    return null;
  };
  const runCommand = (fn: (chain: ChainedCommands) => void): void => {
    const chain = props.state.editor.chain();

    if (hasHeader()) {
      chain.toggleHeaderRow();
    }

    fn(chain);

    if (hasHeader()) {
      chain.toggleHeaderRow();
    }

    chain.fixTables().focus().run();
  };

  return (
    <Show when={props.state.editor.isEditable}>
      <Card
        class={clsx(
          "mb-2 p-1 flex gap-2 m-0",
          !breakpoints.md() && "fixed w-screen -left-1 rounded-none border-x-0"
        )}
      >
        <For
          each={[
            {
              icon: mdiTableRowPlusBefore,
              label: "Insert row above",
              onClick() {
                runCommand((chain) => chain.addRowBefore());
              }
            },
            {
              icon: mdiTableRowPlusAfter,
              label: "Insert row below",
              onClick() {
                runCommand((chain) => chain.addRowAfter());
              }
            },
            {
              icon: mdiTableColumnPlusBefore,
              label: "Insert column left",
              onClick() {
                runCommand((chain) => chain.addColumnBefore());
              }
            },
            {
              icon: mdiTableColumnPlusAfter,
              label: "Insert column right",
              onClick() {
                runCommand((chain) => chain.addColumnAfter());
              }
            },
            {
              label() {
                return hasHeader() ? "Remove header" : "Add header";
              },
              icon() {
                return hasHeader() ? mdiTableHeadersEyeOff : mdiTableHeadersEye;
              },
              onClick() {
                if (hasHeader()) {
                  const { node, pos } = getTableNode(props.state.editor.state.selection)!;

                  node.descendants((descendantNode, descendantPos) => {
                    if (descendantNode.type.name === "tableHeader") {
                      props.state.editor
                        .chain()
                        .command(({ tr, state }) => {
                          tr.setNodeMarkup(
                            pos + descendantPos + 1,
                            state.schema.nodes.tableCell,
                            descendantNode.attrs,
                            descendantNode.marks
                          );

                          return true;
                        })
                        .fixTables()
                        .focus()
                        .run();
                    }
                  });
                } else {
                  props.state.editor.chain().toggleHeaderRow().fixTables().focus().run();
                }
              }
            },
            {
              icon: mdiTableRemove,
              label: "Delete table",
              onClick() {
                props.state.editor.chain().deleteTable().focus().run();
              }
            },
            ...((!breakpoints.md() && [
              {
                icon: mdiKeyboardCloseOutline,
                label: "Close keyboard",
                async onClick() {
                  props.state.editor.commands.blur();
                }
              }
            ]) ||
              [])
          ]}
        >
          {(menuItem) => {
            return (
              <Tooltip
                text={typeof menuItem.label === "string" ? menuItem.label : menuItem.label()}
                class="mt-1"
              >
                <IconButton
                  path={typeof menuItem.icon === "string" ? menuItem.icon : menuItem.icon()}
                  variant="text"
                  text="soft"
                  class="m-0"
                  onClick={menuItem.onClick}
                />
              </Tooltip>
            );
          }}
        </For>
      </Card>
    </Show>
  );
};

export { TableMenu };
