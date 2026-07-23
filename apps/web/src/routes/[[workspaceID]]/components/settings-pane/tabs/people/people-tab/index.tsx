import { Component } from "solid-js";

import { SettingsTab } from "../../../settings-tab";
import { MembersSection } from "./members-section";
import { RolesSection } from "./roles-section";

const PeopleTab: Component = () => {
  return (
    <SettingsTab>
      <MembersSection />
      <RolesSection />
    </SettingsTab>
  );
};

export { PeopleTab };
