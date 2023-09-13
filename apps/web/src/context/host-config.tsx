import { App, useClient } from "./client";
import { ParentComponent, Show, createContext, createResource, useContext } from "solid-js";

const HostConfigContext = createContext<App.HostConfig>();
const HostConfigProvider: ParentComponent = (props) => {
  const client = useClient();
  const [hostConfig] = createResource(() => {
    return client.utils.hostConfig.query();
  });

  return (
    <Show when={!hostConfig.loading && hostConfig()}>
      <HostConfigContext.Provider value={hostConfig()}>{props.children}</HostConfigContext.Provider>
    </Show>
  );
};
const useHostConfig = (): App.HostConfig => {
  return useContext(HostConfigContext)!;
};

export { HostConfigProvider, useHostConfig };
