import { ParentComponent } from "solid-js";

interface SettingsTabProps {
  setTab(tabId: string): void;
  opened?: boolean;
}

const SettingsTab: ParentComponent<SettingsTabProps> = (props) => {
  return <>{props.children}</>;
};

export { SettingsTab };
export type { SettingsTabProps };
