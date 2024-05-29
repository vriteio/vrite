import { Component, For, Show, createMemo } from "solid-js";
import {
  ContextObject,
  ExtensionContentPieceViewContext,
  ExtensionSpec
} from "@vrite/sdk/extensions";
import { createStore, unwrap } from "solid-js/store";
import { Loader } from "#components/primitives";
import { App, useClient, useExtensions, useNotifications } from "#context";
import { ExtensionViewRenderer } from "#lib/extensions";
import { CollapsibleSection } from "#components/fragments";

interface ExtensionsSectionProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"coverWidth">;
  setCustomData(customData: Record<string, any>): void;
}
interface ExtensionIconProps {
  spec: ExtensionSpec;
}

const ExtensionIcon: Component<ExtensionIconProps> = (props) => {
  return (
    <div class="p-1 rounded-lg">
      <div
        class="h-6 w-6 bg-gray-700 dark:bg-gray-100"
        style={{ mask: `url(${props.spec.icon})` }}
      />
    </div>
  );
};
const ExtensionsSection: Component<ExtensionsSectionProps> = (props) => {
  const client = useClient();
  const { installedExtensions } = useExtensions();
  const { notify } = useNotifications();
  const extensionsWithContentPieceView = createMemo(() => {
    return installedExtensions().filter((extension) => {
      return extension.sandbox?.spec.contentPieceView;
    });
  });

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
        <Show when={extensionsWithContentPieceView().length}>
          <For each={extensionsWithContentPieceView()}>
            {(extension) => {
              const [data, setData] = createStore<ContextObject>(
                props.contentPiece.customData?.__extensions__?.[extension.spec.name || ""] || {}
              );

              return (
                <CollapsibleSection
                  icon={<ExtensionIcon spec={extension.spec} />}
                  label={`${extension.spec.displayName || ""}`}
                  defaultOpened={false}
                >
                  <div class="h-full w-full block">
                    <ExtensionViewRenderer<ExtensionContentPieceViewContext>
                      ctx={{
                        contextFunctions: ["notify"],
                        usableEnv: { readable: ["contentPiece"], writable: ["data"] },
                        config: extension!.config || {}
                      }}
                      extension={extension!}
                      func={{ notify }}
                      viewId={extension?.sandbox?.spec.contentPieceView}
                      usableEnvData={{
                        contentPiece: props.contentPiece,
                        data
                      }}
                      onUsableEnvDataUpdate={async (envData) => {
                        setData(envData.data);

                        try {
                          await client.extensions.updateContentPieceData.mutate({
                            contentPieceId: props.contentPiece.id,
                            extensionId: extension!.id,
                            data: unwrap(data)
                          });
                        } catch (error) {
                          // eslint-disable-next-line no-console
                          console.error(error);
                        }
                      }}
                    />
                  </div>
                </CollapsibleSection>
              );
            }}
          </For>
        </Show>
      </Show>
    </Show>
  );
};

export { ExtensionsSection };
