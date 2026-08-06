import { Card, useShortcuts } from "@andesine/components";
import {
  type RouteSectionProps,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "@solidjs/router";
import { type Component, createEffect, onCleanup, Show, Suspense } from "solid-js";
import { useLayout } from "#web/context/layout";
import { WorkspaceProvider } from "#web/context/workspace";
import { Breadcrumbs } from "./breadcrumbs";
import { Menu, type MenuItem } from "./menu";
import { ProfileMenu } from "./profile-menu";
import { type PrimaryPanel, SidePanel, usePrimaryPanel } from "./side-panel";
import { VerticalResizeHandle } from "./vertical-resize-handle";
import { SnapshotErrorDialog } from "./snapshot-error-dialog";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { useNotify } from "#web/context/notifications";

const DEFAULT_SIDE_PANEL_WIDTH = 248;
const MAX_SIDE_PANEL_WIDTH = 640;

const WorkspaceLayout: Component<RouteSectionProps> = (props) => {
  const params = useParams<{ workspaceID: string }>();
  const location = useLocation();
  const { layout, setLayout } = useLayout();
  const registerShortcuts = useShortcuts();
  const navigate = useNavigate();
  const notify = useNotify();
  const isOnline = useConnectivitySignal();
  const [, setSearchParams] = useSearchParams();
  const panel = usePrimaryPanel();
  const workspacePath = () => `/${params.workspaceID || ""}`;
  const isSettingsRoute = () => location.pathname.startsWith(`${workspacePath()}/settings`);
  const openPanel = (nextPanel: PrimaryPanel) => {
    if (nextPanel === "settings") {
      if (!isOnline()) {
        notify({ type: "error", text: "Settings are unavailable while offline" });

        return;
      }

      if (panel() !== "settings") {
        navigate(`${workspacePath()}/settings/personal`);
      }
    } else if (nextPanel === "explorer" && isSettingsRoute()) {
      navigate(workspacePath());
    } else {
      setSearchParams({ p: nextPanel === "help" ? "help" : undefined });
    }

    if (layout.leftSidePanelWidth === 0) {
      setLayout("leftSidePanelWidth", DEFAULT_SIDE_PANEL_WIDTH);
    }
  };
  const menu: MenuItem[] = [
    {
      label: "Explorer",
      icon: "i-lucide:files",
      get active() {
        return panel() === "explorer";
      },
      onClick() {
        openPanel("explorer");
      }
    },
    { separator: true },
    {
      label: "Help",
      icon: "i-lucide:help-circle",
      get active() {
        return layout.leftSidePanelWidth > 0 && panel() === "help";
      },
      onClick() {
        openPanel("help");
      }
    },
    {
      label: "Settings",
      shortcut: "$mod+,",
      icon: "i-lucide:settings-2",
      get active() {
        return panel() === "settings";
      },
      onClick() {
        openPanel("settings");
      }
    }
  ];

  createEffect(() => {
    const unregister = registerShortcuts({
      "$mod+,": () => {
        openPanel("settings");
        return true;
      }
    });

    onCleanup(unregister);
  });

  return (
    <WorkspaceProvider>
      <div class="flex h-full w-full">
        <div class="flex w-full py-3">
          <Show when={layout.leftSidePanelWidth === 0}>
            <Menu class="p-3 py-2" menu={menu} direction="vertical" />
          </Show>
          <div
            class="relative flex flex-col items-start justify-center overflow-hidden"
            style={{
              "width": `${layout.leftSidePanelWidth || 0}px`,
              "max-width": `${MAX_SIDE_PANEL_WIDTH}px`
            }}
          >
            <div class="flex h-full w-full flex-col p-2">
              <Menu menu={menu} class="w-full px-1" />
              <Suspense>
                <SidePanel />
              </Suspense>
              <ProfileMenu />
            </div>
          </div>
          <VerticalResizeHandle
            width={layout.leftSidePanelWidth}
            resize={(size) => setLayout("leftSidePanelWidth", size)}
          />
          <div class="flex h-full min-w-60 flex-1">
            <Card
              class="z-1 relative flex h-full flex-1 flex-col items-center justify-center overflow-hidden p-0"
              shade
            >
              <Breadcrumbs />
              <Suspense fallback={<div class="flex-1" />}>{props.children}</Suspense>
            </Card>
          </div>
          <div class="w-3" />
        </div>
      </div>
      <SnapshotErrorDialog />
    </WorkspaceProvider>
  );
};

export default WorkspaceLayout;
