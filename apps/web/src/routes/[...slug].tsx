import { Component, createSignal, Show } from "solid-js";
import { RouteSectionProps } from "@solidjs/router";
import {
  EditorPane,
  ExplorerSidePanel,
  Menu,
  MenuItem,
  ProfileMenu,
  VerticalResizeHandle
} from "./components";
import { SettingsModal } from "./components/settings-modal";
import { Card } from "#web/components/primitives";
import { useLayout } from "#web/context";

const HomePage: Component<RouteSectionProps> = () => {
  const { layout, setLayout } = useLayout();
  const [settingsModalOpened, setSettingsModalOpened] = createSignal(false);
  const maxSidePanelWidth = 640;
  const menu: MenuItem[] = [
    { label: "Explorer", icon: "i-lucide:files", active: true },
    { separator: true },
    { label: "Help", icon: "i-lucide:help-circle" },
    {
      label: "Settings",
      icon: "i-lucide:settings-2",
      onClick() {
        setSettingsModalOpened(true);
      }
    }
  ];
  const secondaryMenu: MenuItem[] = [
    {
      label: "Comments",
      icon: "i-lucide:messages-square"
    },
    {
      label: "History",
      icon: "i-lucide:history"
    },
    { separator: true }
  ];

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
          <div class="h-full w-full p-3 py-2 flex flex-col">
            <Menu menu={menu} class="w-full" />
            <ExplorerSidePanel />
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
        <VerticalResizeHandle
          width={layout.rightSidePanelWidth}
          resize={(size) => {
            setLayout("rightSidePanelWidth", size);
          }}
          side="right"
        />
        <div
          class="flex flex-col relative items-start justify-start overflow-hidden w-80"
          style={{
            "width": `${layout.rightSidePanelWidth}px`,
            "max-width": `${maxSidePanelWidth}px`
          }}
        >
          <div class="h-full w-full p-3 py-2 flex flex-col">
            <Menu menu={secondaryMenu} class="w-full" />
            <div class="flex-1"></div>
          </div>
        </div>
        <Show when={layout.rightSidePanelWidth === 0}>
          <div class="w-3" />
        </Show>
      </div>
      <SettingsModal opened={settingsModalOpened()} setOpened={setSettingsModalOpened} />
    </div>
  );
};

export default HomePage;
