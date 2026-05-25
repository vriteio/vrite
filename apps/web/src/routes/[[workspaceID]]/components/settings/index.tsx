import { Overlay, Card, IconButton, Fragment, ScrollShadow, createRef } from "@andesine/components";
import clsx from "clsx";
import { Component, createMemo, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { PersonalTab } from "./tabs/personal";
import { useWorkspace } from "#web/context/workspace";

interface SettingsProps {
  activeTab: string;
  setActiveTab(tab: string): void;
}

const Settings: Component<SettingsProps> = (props) => {
  const { sessions, currentWorkspace } = useWorkspace();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const userName = createMemo(() => {
    const sessionList = sessions();
    const user = sessionList.find((s) => s.user.id === currentWorkspace()?.userID)?.user;

    return user?.name || user?.email || "Profile";
  });
  const menu = createMemo(() => {
    return [
      {
        label: "Personal",
        items: [
          {
            icon: "i-lucide:circle-user",
            label: userName(),
            id: "profile",
            description: "Manage your personal profile and security settings",
            tab: PersonalTab
          }
        ]
      },
      ...(Boolean(currentWorkspace())
        ? [
            {
              label: "Workspace",
              items: [
                {
                  icon: "i-lucide:hexagon",
                  label: "General",
                  id: "workspace",
                  description: "Manage your workspace profile",
                  tab: Fragment // WorkspaceGeneralTab
                },
                {
                  icon: "i-lucide:users",
                  label: "People",
                  id: "people",
                  tab: Fragment, //PeopleSettingsTab,
                  description: "Manage workspace members, invitations, and roles"
                },
                {
                  icon: "i-lucide:credit-card",
                  label: "Billing",
                  id: "billing",
                  tab: Fragment, //BillingSettingsTab,
                  description: "Manage your billing information"
                },

                {
                  icon: "i-lucide:code-xml",
                  label: "API",
                  id: "api",
                  tab: Fragment, //APISettingsTab,
                  description: "Manage your workspace API access"
                }
              ]
            }
          ]
        : [])
    ] as Array<{
      label: string;
      items: Array<{
        icon: string;
        label: string;
        id: string;
        description?: string;
        tab?: Component<Record<string, any>>;
      }>;
    }>;
  });
  const menuItems = createMemo(() => menu().flatMap((subMenu) => subMenu.items));
  const activeTab = createMemo(() => {
    return menuItems().find((item) => item.id === props.activeTab);
  });

  return (
    <Overlay opened={Boolean(props.activeTab)} onOverlayClick={() => props.setActiveTab("")}>
      <Card
        class="flex h-[min(92dvh,42rem)] w-[min(96vw,72rem)] flex-col gap-3 overflow-hidden rounded-[1.25rem] p-3 outline-0 lg:flex-row"
        color="contrast"
      >
        <div class="flex min-h-0 flex-col gap-3 lg:w-48 lg:pr-3">
          <div class="flex min-w-0 gap-3 pb-1 lg:flex-col lg:pb-0">
            <For each={menu()}>
              {(subMenu) => {
                return (
                  <div class="flex min-w-48 flex-col lg:min-w-0 lg:w-48">
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
                                    props.activeTab !== item.id && "text-gray-700 dark:text-white"
                                  )}
                                >
                                  {item.label}
                                </span>
                              )}
                              icon={item.icon}
                              iconProps={{ class: "w-5 h-5" }}
                              variant={props.activeTab === item.id ? "solid" : "text"}
                              text={props.activeTab === item.id ? "primary" : "soft"}
                              color={props.activeTab === item.id ? "primary" : "base"}
                              class="justify-start whitespace-nowrap p-0.5 pl-1"
                              onClick={() => props.setActiveTab(item.id)}
                            ></IconButton>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
          <div class="flex-1" />
        </div>
        <Card
          class="relative z-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-0"
          shade
        >
          <div class="flex flex-col px-4 pb-3 pt-4">
            <h2 class="text-xl font-semibold leading-tight">{activeTab()?.label || "Settings"}</h2>
            <Show when={activeTab()?.description}>
              <p class="text-sm text-gray-400 dark:text-gray-500">{activeTab()?.description}</p>
            </Show>
          </div>
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} show={{ top: false }} />
          <div
            class="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 scrollbar-sm flex flex-col"
            ref={setScrollableContainerRef}
          >
            <Dynamic component={activeTab()?.tab} setTab={props.setActiveTab} />
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { Settings };
