import { RouteSectionProps } from "@solidjs/router";
import { Component } from "solid-js";

import { SettingsProvider } from "./settings-context";
import { VerificationDialog } from "./verification-dialog";

const SettingsLayout: Component<RouteSectionProps> = (props) => {
  return (
    <SettingsProvider>
      {props.children}
      <VerificationDialog />
    </SettingsProvider>
  );
};

export default SettingsLayout;
