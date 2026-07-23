import { Component } from "solid-js";
import { SettingsTab } from "../../../settings-tab";
import { CredentialsSection } from "./credentials-section";

const APITab: Component = () => {
  return (
    <SettingsTab>
      <CredentialsSection />
    </SettingsTab>
  );
};

export { APITab };
