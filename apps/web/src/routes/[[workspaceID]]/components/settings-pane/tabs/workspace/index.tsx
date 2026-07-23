import { Component } from "solid-js";
import { SettingsTab } from "../../settings-tab";
import { WorkspaceProfileSection } from "./profile-section";

const WorkspaceTab: Component = () => {
  return (
    <SettingsTab>
      <WorkspaceProfileSection />
    </SettingsTab>
  );
};

export { WorkspaceTab };
