import { Component } from "solid-js";
import { SettingsTab, SettingsTabProps } from "../../settings-tab";
import { CredentialsSection } from "./credentials-section";
import { CreateKeyTab } from "./create-key-tab";

const APISettingsTab: Component<SettingsTabProps> = (props) => {
  return (
    <SettingsTab {...props}>
      <CredentialsSection {...props} />
    </SettingsTab>
  );
};

export { APISettingsTab, CreateKeyTab };
