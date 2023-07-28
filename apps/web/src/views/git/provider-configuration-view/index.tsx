import { GitHubConfigurationView } from "./github";
import { mdiTune } from "@mdi/js";
import { Component, Match, Switch } from "solid-js";
import { TitledCard } from "#components/fragments";

interface ProviderConfigurationViewProps {
  providerName: string;
  close(): void;
  setActionComponent(component: Component<{}> | null): void;
}

const ProviderConfigurationView: Component<ProviderConfigurationViewProps> = (props) => {
  return (
    <TitledCard icon={mdiTune} label="Configure">
      <Switch>
        <Match when={props.providerName === "github"}>
          <GitHubConfigurationView setActionComponent={props.setActionComponent} />
        </Match>
      </Switch>
    </TitledCard>
  );
};

export { ProviderConfigurationView };
