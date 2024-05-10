import {
  mdiTableColumnRemove,
  mdiTableHeadersEyeOff,
  mdiTableMergeCells,
  mdiTableRemove,
  mdiTableRowRemove,
  mdiTableSplitCell
} from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createEffect, on } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { CellSelection } from "@tiptap/pm/tables";
import { Node } from "@tiptap/pm/model";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { createRef } from "#lib/utils";

const TableMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  setMode(mode: string): void;
}> = (props) => {
  const getTableNode = (selection: CellSelection): Node | null => {
    for (let { depth } = selection.$anchorCell; depth > 0; depth--) {
      const node = selection.$anchorCell.node(depth);

      if (node.type.name === "table") {
        return node;
      }
    }

    return null;
  };
  const getTableRowNode = (selection: CellSelection): Node | null => {
    for (let { depth } = selection.$anchorCell; depth > 0; depth--) {
      const node = selection.$anchorCell.node(depth);

      if (node.type.name === "tableRow") {
        return node;
      }
    }

    return null;
  };
  const tableMenus = [
    {
      icon: mdiTableHeadersEyeOff,
      label: "Toggle header cell off",
      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = getTableNode(selection);
          const rowNode = getTableRowNode(selection);

          if (tableNode && rowNode && tableNode.child(0) === rowNode) {
            return false;
          }

          return selection.$anchorCell.nodeAfter?.type.name === "tableHeader";
        }

        return false;
      },
      onClick() {
        props.editor.chain().toggleHeaderCell().focus().run();
      }
    },
    {
      icon: mdiTableMergeCells,
      label: "Merge cells",
      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          return selection.$anchorCell.pos !== selection.$headCell.pos;
        }

        return false;
      },
      onClick() {
        props.editor.chain().mergeCells().run();
      }
    },
    {
      icon: mdiTableSplitCell,
      label: "Split cell",
      show() {
        const { selection } = props.editor.state;

        if (
          selection instanceof CellSelection &&
          selection.$anchorCell.pos === selection.$headCell.pos
        ) {
          return (
            selection.$anchorCell.nodeAfter?.attrs.colspan > 1 ||
            selection.$anchorCell.nodeAfter?.attrs.rowspan > 1
          );
        }

        return false;
      },
      onClick() {
        props.editor.chain().splitCell().run();
      }
    },
    {
      icon: mdiTableColumnRemove,
      label: "Delete column(s)",
      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = getTableNode(selection);

          let isSingleColumn = false;

          tableNode?.content.forEach((rowNode) => {
            isSingleColumn = rowNode.childCount === 1;
          });

          return !isSingleColumn;
        }

        return true;
      },
      onClick() {
        props.editor.chain().deleteColumn().focus().run();
      }
    },
    {
      icon: mdiTableRowRemove,
      label: "Delete row(s)",

      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = getTableNode(selection);

          if (tableNode?.content.childCount === 1) {
            return false;
          }
        }

        return true;
      },
      onClick() {
        props.editor.chain().deleteRow().focus().run();
      }
    },
    {
      icon: mdiTableRemove,
      label: "Delete table",

      show() {
        const { selection } = props.editor.state;

        if (selection instanceof CellSelection) {
          const tableNode = getTableNode(selection);

          if (tableNode?.childCount === 1) return true;

          let isSingleColumn = false;

          tableNode?.content.forEach((rowNode) => {
            isSingleColumn = rowNode.childCount === 1;
          });

          return isSingleColumn;
        }

        return false;
      },
      onClick() {
        props.editor.chain().deleteTable().focus().run();
      }
    }
  ];

  return (
    <Card
      class={clsx(
        "relative flex p-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
        props.class
      )}
    >
      <For
        each={tableMenus}
        fallback={<span class="px-1.5 py-0.5 text-base">No available options</span>}
      >
        {(menuItem) => {
          return (
            <Show when={!menuItem.show || menuItem.show()}>
              <Tooltip text={menuItem.label} side="bottom" wrapperClass="snap-start">
                <IconButton
                  path={menuItem.icon}
                  text="soft"
                  variant="text"
                  color="base"
                  onClick={(event) => {
                    menuItem.onClick();
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                />
              </Tooltip>
            </Show>
          );
        }}
      </For>
    </Card>
  );
};

export { TableMenu };
