import { Component } from "solid-js";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { SettingsTab } from "../../settings-tab";

const PersonalTab: Component = () => {
  return (
    <SettingsTab>
      <ProfileSection />
      <SecuritySection />
    </SettingsTab>
  );
};

export { PersonalTab };
