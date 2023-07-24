import { ExtensionCard } from "./extension-card";
import { mdiPuzzle, mdiDownload } from "@mdi/js";
import { Component, createResource, Show, For } from "solid-js";
import { useExtensions } from "#context";
import { TitledCard } from "#components/fragments";
import { Loader } from "#components/primitives";
import { ExtensionDetails } from "#context/extensions";

const ExtensionsMenuView: Component<{
  setOpenedExtension(extension: ExtensionDetails): void;
}> = (props) => {
  const { getAvailableExtensions, installedExtensions } = useExtensions();
  const [availableExtensions] = createResource(getAvailableExtensions, { initialValue: [] });

  return (
    <>
      <TitledCard icon={mdiPuzzle} label="Installed">
        <Show
          when={installedExtensions().length > 0}
          fallback={
            <Show when={!installedExtensions.loading} fallback={<Loader />}>
              <span class="px-2 w-full text-start text-gray-500 dark:text-gray-400">
                No extensions installed
              </span>
            </Show>
          }
        >
          <div class="grid w-full grid-cols-1 gap-2 @xl:grid-cols-2">
            <For each={installedExtensions()}>
              {(extension) => {
                return (
                  <ExtensionCard
                    extension={extension}
                    setOpenedExtension={props.setOpenedExtension}
                    installed
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </TitledCard>
      <TitledCard icon={mdiDownload} label="Available">
        <Show
          when={availableExtensions().length > 0}
          fallback={
            <Show when={!availableExtensions.loading} fallback={<Loader />}>
              <span class="px-2 w-full text-start text-gray-500 dark:text-gray-400">
                No other extensions available
              </span>
            </Show>
          }
        >
          <div class="grid w-full grid-cols-1 gap-2 @xl:grid-cols-2">
            <For each={availableExtensions()}>
              {(extension) => {
                return (
                  <ExtensionCard
                    extension={extension}
                    setOpenedExtension={props.setOpenedExtension}
                  />
                );
              }}
            </For>
          </div>
        </Show>
      </TitledCard>
    </>
  );
};

export { ExtensionsMenuView };
