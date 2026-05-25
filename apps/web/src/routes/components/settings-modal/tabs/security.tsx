import { IconButton, Card, DropdownArea, DropdownMenu } from "#web/components/primitives";
import { Component } from "solid-js";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";

interface SettingsTabProps {
  setTab(tabId: string): void;
}

const SecuritySettingsTab: Component<SettingsTabProps> = (props) => {
  return (
    <div class="flex flex-col gap-3">
      <SettingsSection label="Biometrics">
        <Setting
          label="Passkeys"
          description="Passwordless sign-in using biometrics or a hardware security key"
        >
          <div class="flex flex-col gap-3 w-full items-end">
            <IconButton
              label={() => <span class="px-1">Add a passkey</span>}
              class="flex-row-reverse pr-1"
              onClick={() => props.setTab("profile")}
              iconProps={{ class: "h-4 w-4" }}
              icon="i-lucide:plus"
              size="small"
              color="contrast"
              variant="outlined"
              text="soft"
            />
          </div>
        </Setting>
        <div class="w-full flex flex-col gap-2">
          <DropdownArea>
            <Card class="rounded-xl items-center flex p-0 pr-1" color="contrast" shade>
              <div class="flex text-sm gap-1 p-2 items-center">
                <div class="i-fluent:person-passkey-16-regular h-5 w-5 text-gray-400 dark:text-gray-500"></div>
                <span class="font-semibold">GitHub</span>
                <div class="w-px h-4 bg-current rounded-full bg-gray-200" />
                <span class="flex-1 text-gray-400 dark:text-gray-500 text-xs">Dec 10, 2023</span>
              </div>
              <div class="flex-1" />
              <DropdownMenu
                activatorButton={() => {
                  return (
                    <IconButton icon="i-lucide:ellipsis" size="small" variant="text" text="soft" />
                  );
                }}
                options={
                  [
                    {
                      label: "Rename",
                      icon: "i-lucide:pencil",
                      text: "softer",
                      shortcut: "enter",
                      onClick: () => {}
                    },
                    {
                      label: "Delete",
                      icon: "i-lucide:trash",
                      color: "danger",
                      shortcut: "$mod+delete",
                      onClick: () => {}
                    }
                  ] as const
                }
              />
            </Card>
          </DropdownArea>
        </div>
      </SettingsSection>
      <SettingsSection label="2FA">
        <Setting
          label="Two-factor authentication"
          description="Add an extra layer of security to your account by enabling 2FA"
        >
          <IconButton
            label={() => <span class="px-1">Setup 2FA</span>}
            class="flex-row-reverse"
            onClick={() => props.setTab("security")}
            iconProps={{ class: "h-4 w-4" }}
            icon="i-lucide:arrow-right"
            size="small"
            color="contrast"
            variant="outlined"
            text="soft"
          />
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { SecuritySettingsTab };
