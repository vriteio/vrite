import { Card, Dropdown, Spinner, useShortcuts } from "@andesine/components";
import {
  type RouteSectionProps,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "@solidjs/router";
import {
  type Component,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  Suspense
} from "solid-js";
import { useLayout } from "#web/context/layout";
import { PublishingProvider } from "#web/context/publishing";
import { useWorkspace, WorkspaceProvider } from "#web/context/workspace";
import { EditorToolbar } from "./editor-toolbar";
import { Menu } from "./menu";
import { ProfileMenu } from "./profile-menu";
import { type PrimaryPanel, SidePanel, usePrimaryPanel } from "./side-panel";
import { VerticalResizeHandle } from "./vertical-resize-handle";
import { SnapshotErrorDialog } from "./snapshot-error-dialog";
import { useConnectivitySignal } from "@solid-primitives/connectivity";
import { createMediaQuery } from "@solid-primitives/media";
import { useNotify } from "#web/context/notifications";
import { RightSidePanel, useRightSidePanelOptions } from "./right-side-panel";
import clsx from "clsx";

interface WorkspaceRightSidePanelProps {
  hidden: boolean;
}

const DEFAULT_SIDE_PANEL_WIDTH = 248;
const MAX_SIDE_PANEL_WIDTH = 640;

const WorkspaceRightSidePanel: Component<WorkspaceRightSidePanelProps> = (props) => {
  const params = useParams<{ slug?: string }>();
  const { layout, setLayout } = useLayout();
  const { content } = useWorkspace();
  const options = useRightSidePanelOptions();
  const isEntryRoute = () => Boolean(params.slug?.startsWith("ent_"));
  const available = () => {
    return (
      !props.hidden &&
      (options().length > 0 ||
        (isEntryRoute() && layout.rightSidePanelWidth > 0 && content.accessLoading()))
    );
  };

  return (
    <Show when={available()} fallback={<div class="hidden w-3 md:block" />}>
      <aside
        class={clsx(
          "hidden h-full shrink-0 py-3 md:flex",
          layout.rightSidePanelWidth === 0 && "pr-3"
        )}
      >
        <VerticalResizeHandle
          side="right"
          width={layout.rightSidePanelWidth}
          resize={(size) => setLayout("rightSidePanelWidth", size)}
        />
        <div
          class="relative flex flex-col items-start justify-center overflow-hidden"
          style={{
            "width": `${layout.rightSidePanelWidth || 0}px`,
            "max-width": `${MAX_SIDE_PANEL_WIDTH}px`
          }}
        >
          <div class="flex h-full w-full flex-col p-2">
            <Suspense fallback={<div class="h-full w-full" />}>
              <RightSidePanel />
            </Suspense>
          </div>
        </div>
      </aside>
    </Show>
  );
};

const WorkspaceLayout: Component<RouteSectionProps> = (props) => {
  const params = useParams<{ slug?: string; workspaceID: string }>();
  const location = useLocation();
  const { layout, setLayout } = useLayout();
  const registerShortcuts = useShortcuts();
  const navigate = useNavigate();
  const notify = useNotify();
  const md = createMediaQuery("(min-width: 768px)");
  const isOnline = useConnectivitySignal();
  const [, setSearchParams] = useSearchParams();
  const panel = usePrimaryPanel();
  const [mobilePanel, setMobilePanel] = createSignal<PrimaryPanel>(panel());
  const [mobilePanelOpened, setMobilePanelOpened] = createSignal(false);
  const workspacePath = () => `/${params.workspaceID || ""}`;
  const isSettingsRoute = () => location.pathname.startsWith(`${workspacePath()}/settings`);
  const isCollectionAccessRoute = () => Boolean(params.slug?.startsWith("coll_"));
  const activePanel = () => (md() || !mobilePanelOpened() ? panel() : mobilePanel());
  const openPanel = (nextPanel: PrimaryPanel, currentEntryID?: string) => {
    if (nextPanel === "settings") {
      if (!isOnline()) {
        notify({ type: "error", text: "Settings are unavailable while offline" });

        return;
      }
    }

    if (!md()) {
      setMobilePanel(nextPanel);
      setMobilePanelOpened(true);

      return;
    }

    if (nextPanel === "settings") {
      if (panel() !== "settings") {
        navigate(`${workspacePath()}/settings/personal`);
      }
    } else if (nextPanel === "explorer" && isSettingsRoute()) {
      navigate(`${workspacePath()}${currentEntryID ? `/${currentEntryID}` : ""}`);
    } else {
      setSearchParams({ p: nextPanel === "help" ? "help" : undefined });
    }

    if (md() && layout.leftSidePanelWidth === 0) {
      setLayout("leftSidePanelWidth", DEFAULT_SIDE_PANEL_WIDTH);
    }
  };
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

  onMount(() => {
    const closeOnNavigation = (event: MouseEvent) => {
      const target = event.target;
      const navigationTarget = target instanceof Element && target.closest("a, [data-entry]");
      const menuTriggerTarget =
        target instanceof Element && target.closest("[data-entry-menu-trigger]");
      const mobilePanelTarget = target instanceof Element && target.closest("[data-mobile-panel]");

      if (navigationTarget && mobilePanelTarget && !menuTriggerTarget) {
        setMobilePanelOpened(false);
      }
    };

    document.addEventListener("click", closeOnNavigation, true);
    onCleanup(() => document.removeEventListener("click", closeOnNavigation, true));
  });

  return (
    <WorkspaceProvider>
      <PublishingProvider>
        {/* Fixed element to tint Safari's top UI to use bg-gray-50 color */}
        <div class="pointer-events-none fixed left-0 top-0 h-3 w-full bg-gray-50 md:hidden" />
        <div class="flex h-full min-h-0 w-full">
          <aside class="hidden h-full shrink-0 py-3 md:flex">
            <Show when={layout.leftSidePanelWidth === 0}>
              <Menu
                class="p-3 py-2"
                activePanel={activePanel()}
                openPanel={openPanel}
                direction="vertical"
              />
            </Show>
            <div
              class="relative flex flex-col items-start justify-center overflow-hidden"
              style={{
                "width": `${layout.leftSidePanelWidth || 0}px`,
                "max-width": `${MAX_SIDE_PANEL_WIDTH}px`
              }}
            >
              <div class="flex h-full w-full flex-col p-2">
                <Menu activePanel={activePanel()} openPanel={openPanel} class="w-full px-1" />
                <SidePanel />
                <ProfileMenu class="p-1" />
              </div>
            </div>
            <VerticalResizeHandle
              width={layout.leftSidePanelWidth}
              resize={(size) => setLayout("leftSidePanelWidth", size)}
            />
          </aside>
          <div class="flex h-full min-h-0 min-w-0 flex-1 flex-col md:py-3">
            <Card
              class="z-1 @container/editor relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden p-0 max-md:!border-0 max-md:!rounded-none max-md:!shadow-none"
              shade
            >
              <EditorToolbar />
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
              <Menu activePanel={activePanel()} openPanel={openPanel} bottomNavigation />
              <ProfileMenu class="h-full w-full p-0" compact />
            </nav>
          </div>
          <WorkspaceRightSidePanel hidden={isSettingsRoute() || isCollectionAccessRoute()} />
        </div>
        <Dropdown
          title={
            mobilePanel() === "explorer"
              ? "Explorer"
              : mobilePanel() === "settings"
                ? "Settings"
                : "Help"
          }
          class="md:hidden"
          anchorPoint={{ x: 0, y: 0 }}
          mobileSheetDragFromContent={mobilePanel() !== "explorer"}
          opened={mobilePanelOpened()}
          setOpened={setMobilePanelOpened}
          cardProps={{
            style: { "min-height": mobilePanel() === "explorer" ? "50dvh" : undefined }
          }}
          portal
        >
          <div data-mobile-panel class="flex min-h-0 w-full flex-1 flex-col">
            <SidePanel selectedPanel={mobilePanel()} />
          </div>
        </Dropdown>
        <SnapshotErrorDialog />
      </PublishingProvider>
    </WorkspaceProvider>
  );
};

export default WorkspaceLayout;
