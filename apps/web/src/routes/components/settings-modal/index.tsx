import { Overlay, Card, IconButton } from "#web/components/primitives";
import clsx from "clsx";
import { Component, createSignal, createMemo, For, Show } from "solid-js";
import { ProfileMenu } from "../profile-menu";
import { Dynamic } from "solid-js/web";
import { ProfileSettingsTab } from "./tabs/profile";
import { SecuritySettingsTab } from "./tabs/security";
import { AppearanceSettingsTab } from "./tabs/appearance";
import { BillingSettingsTab } from "./tabs/billing";

interface SettingsModalProps {
  opened: boolean;
  setOpened(opened: boolean): void;
}

const SettingsModal: Component<SettingsModalProps> = (props) => {
  const [activeTabId, setActiveTabId] = createSignal("profile");
  const menu = [
    {
      label: "Personal",
      items: [
        {
          icon: "i-lucide:circle-user",
          label: "Profile",
          id: "profile",
          description: "Update your personal information",
          tab: ProfileSettingsTab
        },
        {
          icon: "i-lucide:palette",
          label: "Appearance",
          id: "appearance",
          description: "Customize your workspace appearance",
          tab: AppearanceSettingsTab
        }
      ]
    },
    {
      label: "Workspace",
      items: [
        {
          icon: "i-lucide:hexagon",
          label: "General",
          id: "workspace",
          description: "Manage your workspace settings"
        },
        {
          icon: "i-lucide:credit-card",
          label: "Billing",
          id: "billing",
          tab: BillingSettingsTab,
          description: "Manage your billing information"
        },
        {
          icon: "i-lucide:webhook",
          label: "Webhooks",
          id: "webhooks",
          description: "Manage your workspace webhooks"
        },
        {
          icon: "i-lucide:code-xml",
          label: "API Tokens",
          id: "api-tokens",
          description: "Manage your workspace API tokens"
        }
      ]
    }
  ];
  const menuItems = menu.flatMap((subMenu) => subMenu.items);
  const activeTab = createMemo(() => {
    return menuItems.find((item) => item.id === activeTabId());
  });

  return (
    <Overlay opened={props.opened} onOverlayClick={() => props.setOpened(false)}>
      <Card class="w-6xl flex h-2xl p-3 outline-0 rounded-[1.25rem]" color="contrast">
        <div class="flex flex-col gap-3 pr-3">
          <For each={menu}>
            {(subMenu) => {
              return (
                <div class="flex flex-col w-58">
                  <span class="ml-1 text-gray-400 dark:text-gray-500 text-xs leading-normal">
                    {subMenu.label}
                  </span>
                  <div class="flex flex-col">
                    <For each={subMenu.items}>
                      {(item) => {
                        return (
                          <IconButton
                            label={() => (
                              <span
                                class={clsx(
                                  "ml-1.5",
                                  activeTabId() !== item.id && "text-gray-700 dark:text-white"
                                )}
                              >
                                {item.label}
                              </span>
                            )}
                            icon={item.icon}
                            iconProps={{ class: "w-5 h-5" }}
                            variant={activeTabId() === item.id ? "solid" : "text"}
                            text={activeTabId() === item.id ? "primary" : "soft"}
                            color={activeTabId() === item.id ? "primary" : "base"}
                            class="justify-start whitespace-nowrap p-0.5 pl-1"
                            onClick={() => setActiveTabId(item.id)}
                          ></IconButton>
                        );
                      }}
                    </For>
                  </div>
                </div>
              );
            }}
          </For>
          <div class="flex-1" />
          <ProfileMenu />
        </div>
        <Card class="rounded-2xl h-full p-4 relative overflow-hidden flex-1 z-1" shade>
          <div
            class={clsx(
              "h-128 w-128 -bottom-20 -right-32 -z-1 absolute opacity-1.5",
              activeTab()?.icon
            )}
          />
          <div class="flex items-start justify-center flex-col">
            <h2 class="text-xl font-medium flex-1">{activeTab()?.label}</h2>
            <Show when={activeTab()?.description}>
              <span class="text-gray-400 dark:text-gray-500 text-sm">
                {activeTab()?.description}
              </span>
            </Show>
          </div>
          <div class="pt-3">
            <Dynamic
              component={activeTab()?.tab}
              setTab={(tabId: string) => setActiveTabId(tabId)}
            />
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { SettingsModal };
