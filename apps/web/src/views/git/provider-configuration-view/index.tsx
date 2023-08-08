import { GitHubConfigurationView } from "./github";
import { Component, Match, Switch } from "solid-js";
import { App } from "#context";

interface ProviderConfigurationViewProps {
  providerName: string;
  gitData: App.GitData | null;
  close(): void;
  setActionComponent(component: Component<{}> | null): void;
  setOpenedProvider(provider: string): void;
}

const ProviderConfigurationView: Component<ProviderConfigurationViewProps> = (props) => {
  return (
    <Switch>
      <Match when={props.providerName === "github"}>
        <GitHubConfigurationView
          setActionComponent={props.setActionComponent}
          setOpenedProvider={props.setOpenedProvider}
          gitData={props.gitData}
        />
      </Match>
    </Switch>
  );
};

export { ProviderConfigurationView };
