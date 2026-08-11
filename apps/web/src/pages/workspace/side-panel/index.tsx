import { useLocation, useParams, useSearchParams } from "@solidjs/router";
import { type Accessor, type Component, Match, Switch } from "solid-js";

import { ExplorerPanel } from "./explorer";
import { HelpPanel } from "./help";
import { SettingsMenu } from "./settings-menu";

interface SidePanelProps {
  selectedPanel?: PrimaryPanel;
}

type PrimaryPanel = "explorer" | "help" | "settings";

const usePrimaryPanel = (): Accessor<PrimaryPanel> => {
  const location = useLocation();
  const params = useParams<{ workspaceID?: string }>();
  const [searchParams] = useSearchParams();
  const settingsPath = () => `/${params.workspaceID || ""}/settings`;

  return () => {
    if (searchParams.p === "help") {
      return "help";
    }

    if (
      location.pathname === settingsPath() ||
      location.pathname.startsWith(`${settingsPath()}/`)
    ) {
      return "settings";
    }

    return "explorer";
  };
};

const SidePanel: Component<SidePanelProps> = (props) => {
  const routePanel = usePrimaryPanel();
  const panel = () => props.selectedPanel || routePanel();

  return (
    <Switch>
      <Match when={panel() === "settings"}>
        <SettingsMenu />
      </Match>
      <Match when={panel() === "help"}>
        <HelpPanel />
      </Match>
      <Match when={panel() === "explorer"}>
        <ExplorerPanel />
      </Match>
    </Switch>
  );
};

export { SidePanel, usePrimaryPanel };
export type { PrimaryPanel };
