import { getCustomElements } from "../element/utils";
import { mdiKeyboardCloseOutline, mdiTrashCanOutline } from "@mdi/js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Component, For, Show } from "solid-js";
import clsx from "clsx";
import { Node as PMNode } from "@tiptap/pm/model";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { breakpoints } from "#lib/utils";
import { useExtensions } from "#context";

interface CustomNodeMenuProps {
  state: {
    container: HTMLElement | null;
    editor: SolidEditor;
  };
}

const CustomNodeMenu: Component<CustomNodeMenuProps> = (props) => {
  const { installedExtensions } = useExtensions();
  const customElements = getCustomElements(installedExtensions);

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
              icon: mdiTrashCanOutline,
              label: "Delete element",
              onClick() {
                props.state.editor
                  .chain()
                  .command(({ editor, tr }) => {
                    const { selection } = editor.state;
                    const currentDepth = selection.$from.depth;

                    let node: PMNode | null = null;
                    let pos: number | null = null;

                    for (let i = currentDepth; i >= 0; i--) {
                      const currentNode = selection.$from.node(i);

                      if (
                        currentNode.type.name === "element" &&
                        customElements[currentNode.attrs.type.toLowerCase()]
                      ) {
                        node = currentNode;
                        pos = i > 0 ? selection.$from.before(i) : 0;
                        break;
                      }
                    }

                    if (!node || pos === null) return false;

                    tr.delete(pos, pos + node.nodeSize);

                    return true;
                  })
                  .focus()
                  .run();
              }
            },
            ...((!breakpoints.md() && [
              {
                icon: mdiKeyboardCloseOutline,
                tooltip: "Close keyboard",
                async onClick() {
                  props.state.editor.commands.blur();
                }
              }
            ]) ||
              [])
          ]}
        >
          {(menuItem) => {
            const button = (
              <IconButton
                path={menuItem.icon}
                variant="text"
                text="soft"
                class="m-0"
                onClick={menuItem.onClick}
                label={menuItem.label}
              />
            );

            if (menuItem.tooltip) {
              return (
                <Tooltip text={menuItem.tooltip} class="mt-1">
                  {button}
                </Tooltip>
              );
            }

            return button;
          }}
        </For>
      </Card>
    </Show>
  );
};

export { CustomNodeMenu };
