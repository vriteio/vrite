import { Component, For, Show, createMemo, createSignal } from "solid-js";
import {
  ContextObject,
  ContextValue,
  ExtensionContentPieceViewContext,
  ExtensionSpec
} from "@vrite/extensions";
import { Loader, Tooltip, Card } from "#components/primitives";
import { App, ExtensionDetails, useExtensionsContext } from "#context";
import { ViewContextProvider, ViewRenderer } from "#lib/extensions";
import clsx from "clsx";

interface ExtensionsSectionProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">;
  setCustomData(customData: Record<string, any>): void;
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
const ExtensionsSection: Component<ExtensionsSectionProps> = (props) => {
  const { installedExtensions } = useExtensionsContext();
  const extensionsWithContentPieceView = createMemo(() => {
    return installedExtensions().filter((extension) => {
      return extension.spec.contentPieceView;
    });
  });
  const [activeExtension, setActiveExtension] = createSignal<ExtensionDetails | null>(
    extensionsWithContentPieceView()[0] || null
  );

  return (
    <Show
      when={true}
      fallback={
        <div class="flex items-center justify-center w-full">
          <Loader />
        </div>
      }
    >
      <Show
        fallback={
          <p class="w-full px-3 text-center text-gray-500 dark:text-gray-400">
            No extensions installed.
          </p>
        }
        when={true}
      >
        <div class="flex gap-1">
          <div class="flex flex-col gap-1">
            <For each={extensionsWithContentPieceView()}>
              {(extension) => {
                return (
                  <Tooltip text={extension.spec.displayName} side="right" class="ml-1">
                    <button onClick={() => setActiveExtension(extension)}>
                      <ExtensionIcon
                        spec={extension.spec}
                        class={clsx(
                          "border-2",
                          activeExtension()?.id === extension.id
                            ? "border-primary"
                            : "border-gray-200 dark:border-gray-700"
                        )}
                      />
                    </button>
                  </Tooltip>
                );
              }}
            </For>
          </div>
          <Card class="flex flex-col justify-center flex-1 p-3 m-0" color="base">
            <Show
              when={activeExtension()}
              keyed
              fallback={
                <p class="prose text-gray-500 dark:text-gray-400">No extensions available</p>
              }
            >
              <ViewContextProvider<ExtensionContentPieceViewContext>
                extension={activeExtension()!}
                config={activeExtension()!.config || {}}
                contentPiece={props.contentPiece}
                data={
                  props.contentPiece.customData?.__extensions__?.[
                    activeExtension()!.spec.name || ""
                  ] || {}
                }
                setData={(keyOrObject: string | ContextObject, value?: ContextValue) => {
                  let extensionDataUpdate: ContextObject = {};

                  if (typeof keyOrObject === "string" && typeof value !== "undefined") {
                    extensionDataUpdate[keyOrObject] = value;
                  } else if (typeof keyOrObject === "object") {
                    extensionDataUpdate = keyOrObject;
                  }

                  if (props.contentPiece.locked) return;

                  props.setCustomData({
                    ...(props.contentPiece.customData || {}),
                    __extensions__: {
                      ...(props.contentPiece.customData?.__extensions__ || {}),
                      [activeExtension()!.spec.name || ""]: {
                        ...(props.contentPiece.customData?.__extensions__?.[
                          activeExtension()!.spec.name || ""
                        ] || {}),
                        ...extensionDataUpdate
                      }
                    }
                  });
                }}
              >
                <ViewRenderer spec={activeExtension()!.spec} view="contentPieceView" />
              </ViewContextProvider>
            </Show>
          </Card>
        </div>
      </Show>
    </Show>
  );
};

export { ExtensionsSection };
