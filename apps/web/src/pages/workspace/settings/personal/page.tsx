import { Component } from "solid-js";
import { SettingsPage } from "../settings-page";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";

const PersonalSettingsPage: Component = () => (
  <SettingsPage title="Profile">
    <ProfileSection />
    <SecuritySection />
  </SettingsPage>
);

export default PersonalSettingsPage;
