import { Fragment, ScrollShadow, createRef } from "@andesine/components";
import { Component, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Breadcrumbs } from "#web/components/breadcrumbs";
import { useSettings } from "#web/context/settings";
import { PersonalTab } from "./tabs/personal";
import { WorkspaceTab } from "./tabs/workspace";
import { InviteTab, PeopleTab, RoleTab } from "./tabs/people";
import { BillingTab } from "./tabs/billing";
import { APITab, KeyTab } from "./tabs/api";
import { SettingsPaneProvider } from "./settings-pane-context";
import { VerificationDialog } from "./verification-dialog";

const SettingsPane: Component = () => {
  const settings = useSettings();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const parentTabs = createMemo(() => settings.menu().flatMap((subMenu) => subMenu.items));
  const activeParentTab = createMemo(() => {
    return parentTabs().find((item) => {
      return (
        item.id === settings.activeTabID ||
        item.subItems?.some((item) => item.id === settings.activeTabID)
      );
    });
  });
  const activeChildTab = createMemo(() => {
    return activeParentTab()?.subItems?.find((item) => item.id === settings.activeTabID);
  });
  const activeTab = () => activeChildTab() || activeParentTab();
  const activeTabComponent = createMemo(() => {
    switch (settings.activeTabID) {
      case "personal":
        return PersonalTab;
      case "workspace":
        return WorkspaceTab;
      case "people":
        return PeopleTab;
      case "invite":
        return InviteTab;
      case "billing":
        return BillingTab;
      case "api":
        return APITab;
      default:
        if (settings.activeTabID === "key" || settings.activeTabID.startsWith("key-")) {
          return KeyTab;
        }

        return settings.activeTabID === "role" || settings.activeTabID.startsWith("role-")
          ? RoleTab
          : Fragment;
    }
  });

  return (
    <SettingsPaneProvider setTab={settings.setActiveTabID}>
      <Breadcrumbs
        icon={<span class="i-lucide:settings-2 h-5 w-5" />}
        iconTooltip="Settings"
        items={[
          { label: activeParentTab()?.label || "Settings" },
          ...(activeChildTab() ? [{ label: activeChildTab()!.label }] : [])
        ]}
      />
      <div class="flex w-full flex-1 overflow-hidden px-4">
        <div class="relative flex h-full w-full overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
          <div class="relative z-0 w-full overflow-auto p-5" ref={setScrollableContainerRef}>
            <div class="flex w-full flex-col items-center">
              <div class="relative my-2 flex w-full max-w-[44rem] flex-col">
                <h1 class="my-3 text-5xl font-semibold">{activeTab()?.label || "Settings"}</h1>
                <Dynamic component={activeTabComponent()} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <VerificationDialog />
    </SettingsPaneProvider>
  );
};

export { SettingsPane };
