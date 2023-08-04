import { providers } from "./providers";
import { mdiGit } from "@mdi/js";
import { Component, For } from "solid-js";
import { IconButton } from "#components/primitives";
import { TitledCard } from "#components/fragments";

interface InitialSetupViewProps {
  setOpenedProvider(providerName: string): void;
}

const InitialSetupView: Component<InitialSetupViewProps> = (props) => {
  return (
    <TitledCard icon={mdiGit} label="Setup">
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
    </TitledCard>
  );
};

export { InitialSetupView };
