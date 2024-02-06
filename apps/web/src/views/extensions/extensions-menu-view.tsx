import { ExtensionCard } from "./extension-card";
import { mdiPuzzle, mdiDownload } from "@mdi/js";
import { Component, Show, For } from "solid-js";
import { useExtensions } from "#context";
import { TitledCard } from "#components/fragments";
import { Loader } from "#components/primitives";
import { ExtensionDetails } from "#context/extensions";

const ExtensionsMenuView: Component<{
  setOpenedExtension(extension: ExtensionDetails): void;
}> = (props) => {
  const {
    availableExtensions,
    installedExtensions,
    loadingAvailableExtensions,
    loadingInstalledExtensions
  } = useExtensions();

  return (
    <>
      <TitledCard icon={mdiPuzzle} label="Installed">
        <Show
          when={installedExtensions().length > 0}
          fallback={
            <Show when={!loadingInstalledExtensions()} fallback={<Loader />}>
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
            <Show when={!loadingAvailableExtensions()} fallback={<Loader />}>
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
