import { Component } from "solid-js";

import { SettingsPage } from "../settings-page";
import { MembersSection } from "./members-section";
import { RolesSection } from "./roles-section";

const PeopleSettingsPage: Component = () => {
  return (
    <SettingsPage title="People">
      <MembersSection />
      <RolesSection />
    </SettingsPage>
  );
};

export default PeopleSettingsPage;
