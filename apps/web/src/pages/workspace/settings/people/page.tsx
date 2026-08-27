import { type Component } from "solid-js";

import { MembersSection } from "./members-section";
import { GroupsSection } from "./groups-section";
import { RolesSection } from "./roles-section";

const PeopleSettingsPage: Component = () => (
  <>
    <MembersSection />
    <GroupsSection />
    <RolesSection />
  </>
);

export default PeopleSettingsPage;
