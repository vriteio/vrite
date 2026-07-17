import { Component } from "solid-js";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { SettingsTab, SettingsTabProps } from "../../settings-tab";

const PersonalTab: Component<SettingsTabProps> = (props) => {
  return (
    <SettingsTab {...props}>
      <ProfileSection />
      <SecuritySection />
    </SettingsTab>
  );
};

export { PersonalTab };
