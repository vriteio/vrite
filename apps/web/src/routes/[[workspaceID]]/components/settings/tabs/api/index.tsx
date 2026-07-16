import { Component } from "solid-js";
import { SettingsTab, SettingsTabProps } from "../../settings-tab";
import { CredentialsSection } from "./credentials-section";

const APISettingsTab: Component<SettingsTabProps> = (props) => {
  return (
    <SettingsTab {...props}>
      <CredentialsSection />
    </SettingsTab>
  );
};

export { APISettingsTab };
