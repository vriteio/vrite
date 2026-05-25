import { Component, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { RouteSectionProps, useSearchParams } from "@solidjs/router";
import { Settings } from "./components/settings";
import { useShortcuts } from "@andesine/components";
import { useLayout } from "#web/context/layout";
import { ProfileMenu } from "./components/profile-menu";
import { Menu, MenuItem } from "./components/menu";
import { EditorPane } from "./components/editor";
import { HelpPanel } from "./components/help";
import { ExplorerPanel } from "./components/explorer";
import { VerticalResizeHandle } from "./components/vertical-resize-handle";

const DEFAULT_SIDE_PANEL_WIDTH = 240;

const HomePage: Component<RouteSectionProps> = () => {
  const { layout, setLayout } = useLayout();
  const registerShortcuts = useShortcuts();
  const [searchParams, setSearchParams] = useSearchParams();
  const maxSidePanelWidth = 640;
  const settingsTab = () => `${searchParams.settings || ""}`;
  const setSettingsTab = (settingsTab: string) => {
    setSearchParams({
      settings: settingsTab
    });
  };
  const openPanel = (panel: typeof layout.activePanel) => {
    setLayout("activePanel", panel);
    if (layout.leftSidePanelWidth === 0) {
      setLayout("leftSidePanelWidth", DEFAULT_SIDE_PANEL_WIDTH);
    }
  };

  const menu: MenuItem[] = [
    {
      label: "Explorer",
      icon: "i-lucide:files",
      get active() {
        return layout.leftSidePanelWidth > 0 && layout.activePanel === "explorer";
      },
      onClick() {
        openPanel("explorer");
        return true;
      }
    },
    { separator: true },
    {
      label: "Help",
      icon: "i-lucide:help-circle",
      get active() {
        return layout.leftSidePanelWidth > 0 && layout.activePanel === "help";
      },
      onClick() {
        openPanel("help");
        return true;
      }
    },
    {
      label: "Settings",
      shortcut: "$mod+,",
      icon: "i-lucide:settings-2",
      onClick() {
        if (searchParams.settings) return false;

        setSearchParams({
          settings: "profile"
        });

        return true;
      }
    }
  ];

  createEffect(() => {
    const unregister = registerShortcuts(
      Object.fromEntries(
        menu
          .map((item) => {
            if ("shortcut" in item) {
              return [
                item.shortcut!,
                () => {
                  if (item.onClick) {
                    return item.onClick();
                  }
                }
              ];
            }

            return null;
          })
          .filter(Boolean) as Array<[string, (event: KeyboardEvent) => boolean]>
      )
    );

    onCleanup(() => {
      unregister();
    });
  });

  return (
    <div class="flex h-full w-full">
      <div class="flex w-full py-3">
        <Show when={layout.leftSidePanelWidth === 0}>
          <Menu class="p-3 py-2" menu={menu} direction="vertical" />
        </Show>
        <div
          class="flex flex-col relative items-start justify-center overflow-hidden"
          style={{
            "width": `${layout.leftSidePanelWidth || 0}px`,
            "max-width": `${maxSidePanelWidth}px`
          }}
        >
          <div class="h-full w-full p-2 flex flex-col">
            <Menu menu={menu} class="w-full px-1" />
            <Show when={layout.activePanel === "explorer"}>
              <ExplorerPanel />
            </Show>
            <Show when={layout.activePanel === "help"}>
              <HelpPanel />
            </Show>
            <ProfileMenu />
          </div>
        </div>
        <VerticalResizeHandle
          width={layout.leftSidePanelWidth}
          resize={(size) => {
            setLayout("leftSidePanelWidth", size);
          }}
        />
        <div class="h-full flex-1 min-w-60 flex">
          <EditorPane />
        </div>
        <div class="w-3" />
      </div>
      <Settings activeTab={settingsTab()} setActiveTab={setSettingsTab} />
    </div>
  );
};

export default HomePage;
