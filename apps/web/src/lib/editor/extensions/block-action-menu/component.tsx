import { debounce } from "@solid-primitives/scheduled";
import { Range, createNodeFromContent, generateJSON } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { ExtensionBlockActionViewContext, ExtensionSpec } from "@vrite/sdk/extensions";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { createRef } from "#lib/utils";
import { ExtensionDetails, useExtensions, useNotifications } from "#context";
import { Button, Dropdown, Tooltip } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { ExtensionViewRenderer } from "#lib/extensions";

interface BlockActionMenuProps {
  state: {
    editor: SolidEditor;
    range: Range | null;
    node: PMNode | null;
  };
}
interface ExtensionBlockActionSpec {
  id: string;
  label: string;
  blocks: string[];
  view: string;
}
interface ExtensionIconProps {
  class?: string;
  spec: ExtensionSpec;
}

const ExtensionIcon: Component<ExtensionIconProps> = (props) => {
  return (
    <>
      <Show when={props.spec.icon}>
        <img
          src={props.spec.icon}
          draggable={false}
          class={clsx("w-8 h-8 rounded-lg", props.class, props.spec.iconDark && "dark:hidden")}
        />
      </Show>
      <Show when={props.spec.iconDark}>
        <img
          src={props.spec.iconDark}
          draggable={false}
          class={clsx("w-8 h-8 rounded-lg", props.class, props.spec.icon && "hidden dark:block")}
        />
      </Show>
    </>
  );
};
const BlockActionMenu: Component<BlockActionMenuProps> = (props) => {
  const { notify } = useNotifications();
  const { installedExtensions } = useExtensions();
  const [computeDropdownPosition, setComputeDropdownPosition] = createRef(() => {});
  const [containerRef, setContainerRef] = createRef<HTMLDivElement | null>(null);
  const [range, setRange] = createSignal<Range | null>(props.state.range);
  const [node, setNode] = createSignal<PMNode | null>(props.state.node);
  const [locked, setLocked] = createSignal(false);
  const [opened, setOpened] = createSignal(false);
  const unlock = debounce(() => {
    setLocked(false);
  }, 250);
  const blockActions = createMemo<
    Array<{ blockAction: ExtensionBlockActionSpec; extension: ExtensionDetails }>
  >(() => {
    const blockActions: Array<{
      blockAction: ExtensionBlockActionSpec;
      extension: ExtensionDetails;
    }> = [];

    installedExtensions().forEach((extension) => {
      if (!extension.id) return;

      const spec = extension.sandbox?.spec;

      if (spec?.blockActions) {
        spec.blockActions.forEach((blockAction) => {
          blockActions.push({
            blockAction,
            extension
          });
        });
      }
    });

    return blockActions;
  });

  createEffect(
    on(opened, (opened) => {
      if (opened) {
        setRange(props.state.range);
      }
    })
  );
  createEffect(
    on(
      () => props.state.node,
      () => {
        if (!opened()) {
          setNode(props.state.node);
        }
      }
    )
  );
  props.state.editor.on("blur", () => {
    if (document.activeElement?.contains(containerRef()) || locked()) return;

    setOpened(false);
  });

  return (
    <div
      class={clsx(
        "flex-col ml-2 gap-1 hidden",
        props.state.editor.isEditable ? "md:flex" : "md:hidden"
      )}
      ref={setContainerRef}
    >
      <For each={blockActions()}>
        {({ blockAction, extension }) => {
          const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(
            null
          );

          return (
            <Dropdown
              placement="left-end"
              class={clsx(
                blockAction.blocks.length !== 0 &&
                  !blockAction.blocks.some((block) => {
                    return node()?.type.name === props.state.editor.schema.nodes[block].name;
                  }) &&
                  "hidden"
              )}
              cardProps={{ class: "p-0 m-0 -ml-1 pr-1.5 p-3" }}
              overlayProps={{
                onOverlayClick: () => {
                  if (!locked()) {
                    setOpened(false);
                  }
                }
              }}
              opened={opened()}
              setOpened={setOpened}
              activatorButton={(props) => {
                setComputeDropdownPosition(props.computeDropdownPosition);

                return (
                  <Tooltip text={blockAction.label} side="left" class="-ml-1">
                    <Button
                      class={clsx(
                        "h-8 w-8 p-0 m-0 border-2 flex justify-center items-center",
                        props.opened && "border-primary",
                        !props.opened &&
                          "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:dark:border-gray-700"
                      )}
                      variant="text"
                    >
                      <ExtensionIcon spec={extension.spec} class="h-8 w-8" />
                    </Button>
                  </Tooltip>
                );
              }}
            >
              <div
                ref={setScrollableContainerRef}
                class="text-base overflow-auto pr-1.5 not-prose scrollbar-sm"
              >
                <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
                <ExtensionViewRenderer<ExtensionBlockActionViewContext>
                  extension={extension}
                  ctx={{
                    contextFunctions: ["notify", "replaceContent", "refreshContent"],
                    usableEnv: { readable: ["content"], writable: [] },
                    config: extension.config || {}
                  }}
                  func={{
                    notify,
                    refreshContent: () => {
                      setRange(props.state.range);
                      setNode(props.state.node);
                    },
                    replaceContent(content) {
                      unlock.clear();
                      setLocked(true);

                      if (range()) {
                        let size = 0;

                        const nodeOrFragment = createNodeFromContent(
                          content,
                          props.state.editor.schema
                        );

                        if (nodeOrFragment instanceof PMNode) {
                          size = nodeOrFragment.nodeSize;
                        } else {
                          size = nodeOrFragment.size || 0;
                        }

                        props.state.editor
                          .chain()
                          .focus()
                          .insertContentAt(
                            range()!,
                            generateJSON(content, props.state.editor.extensionManager.extensions)
                          )
                          .scrollIntoView()
                          .focus()
                          .run();
                        setRange({ from: range()!.from, to: range()!.from + size - 1 });
                        computeDropdownPosition()();
                      }

                      unlock();
                    }
                  }}
                  view={`blockActionView:${blockAction.id}`}
                  usableEnvData={{ content: node()?.toJSON() || { type: "doc", content: [] } }}
                />
              </div>
            </Dropdown>
          );
        }}
      </For>
    </div>
  );
};

export { BlockActionMenu };
