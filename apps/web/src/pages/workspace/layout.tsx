import { Card, Dropdown, Spinner, useShortcuts } from "@andesine/components";
import {
  type RouteSectionProps,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "@solidjs/router";
import { type Component, createEffect, createSignal, onCleanup, Show, Suspense } from "solid-js";
import { useLayout } from "#web/context/layout";
import { WorkspaceProvider } from "#web/context/workspace";
import { Breadcrumbs } from "./breadcrumbs";
import { Menu, type MenuItem } from "./menu";
import { ProfileMenu } from "./profile-menu";
import { type PrimaryPanel, SidePanel, usePrimaryPanel } from "./side-panel";
import { VerticalResizeHandle } from "./vertical-resize-handle";
import { SnapshotErrorDialog } from "./snapshot-error-dialog";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { createMediaQuery } from "@solid-primitives/media";
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
  const md = createMediaQuery("(min-width: 768px)");
  const isOnline = useConnectivitySignal();
  const [, setSearchParams] = useSearchParams();
  const panel = usePrimaryPanel();
  const [mobilePanelOpened, setMobilePanelOpened] = createSignal(false);
  const workspacePath = () => `/${params.workspaceID || ""}`;
  const isSettingsRoute = () => location.pathname.startsWith(`${workspacePath()}/settings`);
  const openPanel = (nextPanel: PrimaryPanel) => {
    const alreadyActive = panel() === nextPanel;

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

    if (md() && layout.leftSidePanelWidth === 0) {
      setLayout("leftSidePanelWidth", DEFAULT_SIDE_PANEL_WIDTH);
    }

    if (!md()) {
      setMobilePanelOpened(nextPanel === "help" || alreadyActive);
    }
  };
  const menu: MenuItem[] = [
    {
      label: "Explorer",
      icon: "i-lucide:files",
      get active() {
        return panel() === "explorer";
      },
      secondaryActionMenu: true,
      onClick() {
        openPanel("explorer");
      }
    },
    { separator: true },
    {
      label: "Help",
      icon: "i-lucide:help-circle",
      get active() {
        return panel() === "help" && (!md() || layout.leftSidePanelWidth > 0);
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
      secondaryActionMenu: true,
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

  createEffect(() => {
    if (md()) {
      setMobilePanelOpened(false);
    }
  });

  return (
    <WorkspaceProvider>
      {/* Fixed element to tint Safari's top UI to use bg-gray-50 color */}
      <div class="pointer-events-none fixed left-0 top-0 h-3 w-full bg-gray-50 md:hidden" />
      <div class="flex h-full min-h-0 w-full">
        <aside class="hidden h-full shrink-0 py-3 md:flex">
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
              <SidePanel />
              <ProfileMenu class="p-1" />
            </div>
          </div>
          <VerticalResizeHandle
            width={layout.leftSidePanelWidth}
            resize={(size) => setLayout("leftSidePanelWidth", size)}
          />
        </aside>
        <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col md:py-3 md:pr-3">
          <Card
            class="z-1 relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden p-0 max-md:!border-0 max-md:!rounded-none max-md:!shadow-none"
            shade
          >
            <Breadcrumbs />
            <Suspense
              fallback={
                <div class="flex w-full flex-1 items-center justify-center text-gray-200">
                  <Spinner />
                </div>
              }
            >
              {props.children}
            </Suspense>
          </Card>
          <nav
            class="min-h-12 z-20 box-content grid shrink-0 grid-cols-4 items-center border-t border-gray-200 bg-gray-100 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
            aria-label="Workspace navigation"
          >
            <Menu menu={menu} bottomNavigation />
            <ProfileMenu class="h-full w-full p-0" compact />
          </nav>
        </div>
      </div>
      <Dropdown
        class="md:hidden"
        anchorPoint={{ x: 0, y: 0 }}
        opened={mobilePanelOpened()}
        setOpened={setMobilePanelOpened}
        cardProps={{ class: "max-md:bg-gray-100" }}
        portal
      >
        <div
          class="flex w-full flex-col"
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest("a, [data-entry]")) {
              setMobilePanelOpened(false);
            }
          }}
        >
          <SidePanel />
        </div>
      </Dropdown>
      <SnapshotErrorDialog />
    </WorkspaceProvider>
  );
};

export default WorkspaceLayout;
