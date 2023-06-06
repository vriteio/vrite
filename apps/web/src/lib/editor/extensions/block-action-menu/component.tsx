import { ScrollShadow } from "#components/fragments";
import { Button, Dropdown, Tooltip } from "#components/primitives";
import { ExtensionDetails, useExtensionsContext } from "#context";
import { ViewContextProvider, ViewRenderer, useViewContext } from "#lib/extensions";
import { createRef } from "#lib/utils";
import { Range, generateJSON } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import {
  ExtensionBlockActionSpec,
  ExtensionBlockActionViewContext,
  ExtensionSpec
} from "@vrite/extensions";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, For, Match, Show, Switch, createEffect, createMemo, on } from "solid-js";
import { SetStoreFunction } from "solid-js/store";

interface BlockActionMenuProps {
  state: {
    editor: SolidEditor;
    range: Range | null;
    node: PMNode | null;
  };
}
interface BlockViewRendererProps {
  extension: ExtensionDetails;
  blockActionId: string;
  content: any;
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
          class={clsx("w-8 h-8 rounded-lg", props.class, props.spec.darkIcon && "dark:hidden")}
        />
      </Show>
      <Show when={props.spec.darkIcon}>
        <img
          src={props.spec.darkIcon}
          class={clsx("w-8 h-8 rounded-lg", props.class, props.spec.icon && "hidden dark:block")}
        />
      </Show>
    </>
  );
};
const BlockViewRenderer: Component<BlockViewRendererProps> = (props) => {
  const { setContext } = useViewContext();

  createEffect(
    on(
      () => props.content,
      (content) => {
        (
          setContext as SetStoreFunction<
            Omit<ExtensionBlockActionViewContext, "client" | "token" | "extensionId" | "notify">
          >
        )("content", content);
      }
    )
  );
  return (
    <ViewRenderer spec={props.extension.spec} view={`blockActionView:${props.blockActionId}`} />
  );
};
const BlockActionMenu: Component<BlockActionMenuProps> = (props) => {
  const { installedExtensions } = useExtensionsContext();
  const blockActions = createMemo<
    Array<{ blockAction: ExtensionBlockActionSpec; extension: ExtensionDetails }>
  >(() => {
    const blockActions: Array<{
      blockAction: ExtensionBlockActionSpec;
      extension: ExtensionDetails;
    }> = [];

    installedExtensions().map((extension) => {
      if (extension.spec.blockActions) {
        extension.spec.blockActions.forEach((blockAction) => {
          blockActions.push({
            blockAction,
            extension
          });
        });
      }

      return blockActions;
    });

    return blockActions;
  });
  //const isParagraph = selectedNode.hasMarkup(this.editor.schema.nodes["paragraph"]);
  return (
    <div class="flex flex-col ml-2 gap-1">
      <For each={blockActions()}>
        {({ blockAction, extension }) => {
          const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(
            null
          );
          return (
            <Switch>
              <Match when={blockAction.view}>
                <Dropdown
                  placement="left-end"
                  cardProps={{ class: "p-0 m-0 -ml-1 pr-1.5 p-3" }}
                  activatorButton={(props) => (
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
                  )}
                >
                  <div
                    ref={setScrollableContainerRef}
                    class="text-base overflow-auto pr-1.5 not-prose scrollbar-sm"
                  >
                    <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
                    <ViewContextProvider<ExtensionBlockActionViewContext>
                      extension={extension}
                      config={extension.config || {}}
                      content={props.state.node?.toJSON()}
                      replaceContent={(content) => {
                        if (props.state.range) {
                          props.state.editor
                            .chain()
                            .focus()
                            .insertContentAt(
                              props.state.range,
                              generateJSON(content, props.state.editor.extensionManager.extensions)
                            )
                            .run();
                        }
                      }}
                    >
                      <BlockViewRenderer
                        blockActionId={blockAction.id}
                        extension={extension}
                        content={props.state.node?.toJSON()}
                      />
                    </ViewContextProvider>
                  </div>
                </Dropdown>
              </Match>
              <Match when={blockAction["on:action"]}>
                <Tooltip text={blockAction.label} side="left" class="-ml-1">
                  <Button
                    class={clsx(
                      "h-8 w-8 p-0 m-0 border-2 flex justify-center items-center",
                      "border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:dark:border-gray-700"
                    )}
                    variant="text"
                    onClick={() => {
                      if (props.state.range) {
                        props.state.editor
                          .chain()
                          .focus()
                          .insertContentAt(props.state.range, "test")
                          .run();
                      }
                    }}
                  >
                    <ExtensionIcon spec={extension.spec} class="h-8 w-8" />
                  </Button>
                </Tooltip>
              </Match>
            </Switch>
          );
        }}
      </For>
    </div>
  );
};

export { BlockActionMenu };
