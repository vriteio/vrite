import { providers } from "./providers";
import { mdiGit, mdiSync } from "@mdi/js";
import { IconButton } from "@vrite/components";
import { Component, For } from "solid-js";
import { TitledCard } from "#components/fragments";
import { useClient } from "#context";

interface InitialSetupViewProps {
  setOpenedProvider(providerName: string): void;
}

const InitialSetupView: Component<InitialSetupViewProps> = (props) => {
  const client = useClient();

  return (
    <>
      <TitledCard icon={mdiGit} label="Setup">
        <p class="prose text-gray-500 dark:text-gray-400 w-full">
          To get started with Git sync in Vrite, first configure a provider:
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
      <TitledCard icon={mdiGit} label="Sync">
        <IconButton
          path={mdiSync}
          label="Sync"
          onClick={async () => {
            const result = await client.git.github.sync.mutate();

            console.log(result);
          }}
        />
      </TitledCard>
    </>
  );
};

export { InitialSetupView };
