import { type Component } from "solid-js";

import { WorkspaceProfileSection } from "./profile-section";
import { WorkspaceDeleteSection } from "./delete-section";

const WorkspaceSettingsPage: Component = () => (
  <>
    <WorkspaceProfileSection />
    <WorkspaceDeleteSection />
  </>
);

export default WorkspaceSettingsPage;
