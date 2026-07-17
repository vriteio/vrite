import { RouteSectionProps, useParams } from "@solidjs/router";
import { Component } from "solid-js";
import { WorkspaceProvider } from "#web/context/workspace";
import { SettingsProvider } from "#web/context/settings";

const WorkspaceLayout: Component<RouteSectionProps> = (props) => {
  const params = useParams<{ workspaceID: string }>();

  return (
    <WorkspaceProvider workspaceID={params.workspaceID}>
      <SettingsProvider>{props.children}</SettingsProvider>
    </WorkspaceProvider>
  );
};

export default WorkspaceLayout;
