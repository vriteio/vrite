import { Component } from "solid-js";

import { SettingsPage } from "../settings-page";
import { CredentialsSection } from "./credentials-section";

const APISettingsPage: Component = () => (
  <SettingsPage title="API">
    <CredentialsSection />
  </SettingsPage>
);

export default APISettingsPage;
