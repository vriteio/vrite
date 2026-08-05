import { type Component } from "solid-js";

import { MembersSection } from "./members-section";
import { RolesSection } from "./roles-section";

const PeopleSettingsPage: Component = () => (
  <>
    <MembersSection />
    <RolesSection />
  </>
);

export default PeopleSettingsPage;
