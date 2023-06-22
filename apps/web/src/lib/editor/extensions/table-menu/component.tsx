import { Card, IconButton, Tooltip } from "#components/primitives";
import {
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

interface TableMenuProps {
  state: {
    container: HTMLElement | null;
    editor: SolidEditor;
  };
}
const TableMenu: Component<TableMenuProps> = (props) => {
  const hasHeader = createMemo(() => {
    return props.state.container?.querySelector("th") !== null;
  });
  const runCommand = (fn: (chain: ChainedCommands) => void) => {
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
      <Card class="mb-2 p-1 flex gap-2 m-0">
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
                props.state.editor.chain().focus().toggleHeaderRow().run();
              }
            },
            {
              icon: mdiTableRemove,
              label: "Delete table",
              onClick() {
                props.state.editor.chain().deleteTable().focus().run();
              }
            }
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
