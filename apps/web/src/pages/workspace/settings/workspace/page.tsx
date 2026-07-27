import { Component } from "solid-js";

import { SettingsPage } from "../settings-page";
import { WorkspaceProfileSection } from "./profile-section";

const WorkspaceSettingsPage: Component = () => (
  <SettingsPage title="General">
    <WorkspaceProfileSection />
  </SettingsPage>
);

export default WorkspaceSettingsPage;
