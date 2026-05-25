import { Input, IconButton, Button } from "#web/components/primitives";
import { Component } from "solid-js";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import { client } from "#web/lib/client";
import { useNotify } from "#web/context";

interface SettingsTabProps {
  setTab(tabId: string): void;
}

const ProfileSettingsTab: Component<SettingsTabProps> = (props) => {
  const notify = useNotify();
  return (
    <div class="flex flex-col gap-3">
      <SettingsSection label="About you">
        <Setting label="Full name" description="Your full name">
          <Input
            placeholder="John Doe"
            class="max-w-64"
            size="small"
            color="contrast"
            variant="outlined"
            value="John Doe"
            onChange={(event) => {
              notify({
                text: "Profile updated",
                type: "success"
              });
            }}
          />
        </Setting>
      </SettingsSection>
      <SettingsSection label="Credentials">
        <Setting
          label="Email address"
          description="We'll send an email to both your new and previous inboxes to verify the change."
        >
          <Input
            placeholder="hello@example.com"
            class="max-w-64"
            size="small"
            color="contrast"
            variant="outlined"
          />
        </Setting>
        <Setting
          label="Username"
          description="Username
  Can only contain lowercase letters, numbers, and underscores."
        >
          <Input
            placeholder="john_doe"
            class="max-w-48"
            size="small"
            color="contrast"
            variant="outlined"
          />
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { ProfileSettingsTab };
