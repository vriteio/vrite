import { RouteSectionProps, useParams } from "@solidjs/router";
import { Component } from "solid-js";
import { WorkspaceProvider } from "#web/context/workspace";

const WorkspaceLayout: Component<RouteSectionProps> = (props) => {
  const params = useParams<{ workspaceID: string }>();

  return <WorkspaceProvider workspaceID={params.workspaceID}>{props.children}</WorkspaceProvider>;
};

export default WorkspaceLayout;
