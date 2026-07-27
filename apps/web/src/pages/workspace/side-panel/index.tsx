import { useLocation, useParams, useSearchParams } from "@solidjs/router";
import { Accessor, Component, Match, Switch } from "solid-js";

import { ExplorerPanel } from "./explorer";
import { HelpPanel } from "./help";
import { SettingsMenu } from "./settings-menu";

type PrimaryPanel = "explorer" | "help" | "settings";

const usePrimaryPanel = (): Accessor<PrimaryPanel> => {
  const location = useLocation();
  const params = useParams<{ workspaceID?: string }>();
  const [searchParams] = useSearchParams();
  const settingsPath = () => `/${params.workspaceID || ""}/settings`;

  return () => {
    if (
      location.pathname === settingsPath() ||
      location.pathname.startsWith(`${settingsPath()}/`)
    ) {
      return "settings";
    }

    return searchParams.p === "help" ? "help" : "explorer";
  };
};

const SidePanel: Component = () => {
  const panel = usePrimaryPanel();

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
