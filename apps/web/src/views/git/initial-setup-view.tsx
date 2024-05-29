import { providers } from "./providers";
import { mdiGit } from "@mdi/js";
import { Component, For, Show } from "solid-js";
import { IconButton } from "#components/primitives";
import { CollapsibleSection } from "#components/fragments";
import { hasPermission } from "#context";

interface InitialSetupViewProps {
  setOpenedProvider(providerName: string): void;
}

const InitialSetupView: Component<InitialSetupViewProps> = (props) => {
  return (
    <CollapsibleSection icon={mdiGit} label="Setup">
      <Show
        when={hasPermission("manageGit")}
        fallback={
          <p class="prose text-gray-500 dark:text-gray-400 w-full">
            To configure Git source control in Vrite you need additional permissions.
          </p>
        }
      >
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          To get started with Git source control in Vrite, first configure a provider:
        </p>
        <div class="flex justify-start w-full gap-2">
          <For each={providers}>
            {(provider) => {
              return (
                <IconButton
                  path={provider.icon}
                  label={`Configure ${provider.label}`}
                  color="primary"
                  class="m-0"
                  onClick={() => props.setOpenedProvider(provider.name)}
                />
              );
            }}
          </For>
        </div>
      </Show>
    </CollapsibleSection>
  );
};

export { InitialSetupView };
