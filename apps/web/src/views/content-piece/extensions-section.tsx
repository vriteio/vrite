import { Component, For, Show, createResource, createSignal } from "solid-js";
import { ExtensionContentPieceViewContext, ExtensionSpec } from "@vrite/extensions";
import { Loader, Tooltip, Card } from "#components/primitives";
import { App, useClientContext, useExtensionsContext } from "#context";
import { ViewContextProvider, ViewRenderer } from "#lib/extensions";

interface ExtensionsSectionProps {
  contentPiece: App.ContentPieceWithTags;
}

const ExtensionsSection: Component<ExtensionsSectionProps> = (props) => {
  const { installedExtensions } = useExtensionsContext();
  const { client } = useClientContext();
  const [activeExtension, setActiveExtension] = createSignal<ExtensionSpec | null>(null);
  const [extension] = createResource(activeExtension, async (activeExtension) => {
    try {
      return await client.extensions.get.query({ extensionId: activeExtension.id });
    } catch (e) {
      return null;
    }
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
        <div class="flex">
          <div class="flex flex-col">
            <For each={installedExtensions()}>
              {(extension) => {
                return (
                  <Tooltip text={extension.name} side="right" class="ml-1">
                    <button onClick={() => setActiveExtension(extension)}>
                      <img
                        src={extension.icon}
                        class="h-8 w-8 border-primary border-2 rounded-lg"
                      />
                    </button>
                  </Tooltip>
                );
              }}
            </For>
          </div>
          <Card class="flex flex-col flex-1 p-3 m-0" color="base">
            <Show when={activeExtension() && extension()}>
              <ViewContextProvider<ExtensionContentPieceViewContext>
                spec={activeExtension()!}
                config={extension()!.configuration}
                contentPiece={props.contentPiece}
                data={{}}
                setData={() => {}}
              >
                <ViewRenderer extension={activeExtension()!} view="contentPieceView" />
              </ViewContextProvider>
            </Show>
          </Card>
        </div>
      </Show>
    </Show>
  );
};

export { ExtensionsSection };
