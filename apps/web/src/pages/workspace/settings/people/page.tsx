import { Component } from "solid-js";

import { MembersSection } from "./members-section";
import { RolesSection } from "./roles-section";

const PeopleSettingsPage: Component = () => {
  return (
    <>
      <MembersSection />
      <RolesSection />
    </>
  );
};

export default PeopleSettingsPage;
