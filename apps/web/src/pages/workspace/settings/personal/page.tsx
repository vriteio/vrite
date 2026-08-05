import { type Component } from "solid-js";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";

const PersonalSettingsPage: Component = () => (
  <>
    <ProfileSection />
    <SecuritySection />
  </>
);

export default PersonalSettingsPage;
