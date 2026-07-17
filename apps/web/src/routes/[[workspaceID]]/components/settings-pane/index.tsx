import { Fragment, ScrollShadow, Tooltip, createRef } from "@andesine/components";
import { Component, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { useSettings } from "#web/context/settings";
import { PersonalTab } from "./tabs/personal";
import { WorkspaceGeneralTab } from "./tabs/workspace";
import { PeopleSettingsTab } from "./tabs/people";
import { BillingSettingsTab } from "./tabs/billing";
import { APISettingsTab } from "./tabs/api";

const SettingsPane: Component = () => {
  const settings = useSettings();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const menuItems = createMemo(() => settings.menu().flatMap((subMenu) => subMenu.items));
  const activeTab = createMemo(() => menuItems().find((item) => item.id === settings.activeTabID));
  const activeTabComponent = createMemo(() => {
    switch (settings.activeTabID) {
      case "personal":
        return PersonalTab;
      case "workspace":
        return WorkspaceGeneralTab;
      case "people":
        return PeopleSettingsTab;
      case "billing":
        return BillingSettingsTab;
      case "api":
        return APISettingsTab;
      default:
        return Fragment;
    }
  });

  return (
    <>
      <div class="flex h-11 w-full items-center justify-center gap-2 p-2 pl-4">
        <span class="inline-flex items-center justify-center text-base font-medium leading-[1]">
          <Tooltip content="Settings" fixed>
            <span class="i-lucide:settings-2 h-5 w-5" />
          </Tooltip>
          <span class="i-lucide:chevron-right h-4 w-4 text-gray-400" />
          <span>{activeTab()?.label || "Settings"}</span>
        </span>
        <div class="flex-1" />
      </div>
      <div class="flex w-full flex-1 overflow-hidden px-4">
        <div class="relative flex h-full w-full overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
          <div class="relative z-0 w-full overflow-auto p-5" ref={setScrollableContainerRef}>
            <div class="flex w-full flex-col items-center">
              <div class="relative my-2 flex w-full max-w-[44rem] flex-col">
                <h1 class="my-3 text-5xl font-semibold">{activeTab()?.label || "Settings"}</h1>
                <Dynamic component={activeTabComponent()} setTab={settings.setActiveTabID} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { SettingsPane };
