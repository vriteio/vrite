import { Component } from "solid-js";
import { SettingsTab, SettingsTabProps } from "../../settings-tab";
import { WorkspaceProfileSection } from "./profile-section";

const WorkspaceGeneralTab: Component<SettingsTabProps> = (props) => {
  return (
    <SettingsTab {...props}>
      <WorkspaceProfileSection />
    </SettingsTab>
  );
};

export { WorkspaceGeneralTab };
