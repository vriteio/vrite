import {
  mdiViewDashboard,
  mdiCog,
  mdiLogout,
  mdiPencil,
  mdiGithub,
  mdiHexagonSlice6,
  mdiAccountCircle,
  mdiHelpCircle,
  mdiPuzzle
} from "@mdi/js";
import { Component, For, Show, createSignal } from "solid-js";
import { Link, useLocation, useNavigate } from "@solidjs/router";
import { Dynamic } from "solid-js/web";
import { navigateAndReload } from "#lib/utils";
import { useUIContext, useAuthenticatedContext } from "#context";
import {
  Button,
  IconButton,
  Card,
  Dropdown,
  Tooltip,
  createTooltipController,
  Icon,
  Heading
} from "#components/primitives";
import { logoIcon, discordIcon } from "#assets/icons";

interface MenuItem {
  icon: string;
  label: string;
  link?: string;
  props?: Record<string, string>;
  active?: () => boolean;
  onClick?(): void;
}

const ProfileMenu: Component<{ close(): void }> = (props) => {
  const { profile } = useAuthenticatedContext();
  const { setStorage } = useUIContext();

  return (
    <div class="flex flex-col w-xs p-2 gap-2">
      <div class="flex justify-center items-center">
        <Heading level={2} class="flex-1">
          Profile
        </Heading>
        <IconButton
          path={mdiHelpCircle}
          class="m-0"
          text="soft"
          variant="text"
          onClick={() => {
            props.close();
            setStorage((storage) => ({
              ...storage,
              sidePanelWidth: storage.sidePanelWidth || 375,
              sidePanelView: "default"
            }));
          }}
        />
      </div>
      <Card class="flex gap-3 justify-start items-center m-0" color="contrast">
        <Show
          when={profile()?.avatar}
          fallback={
            <Icon path={mdiAccountCircle} class="h-10 w-10 text-gray-500 dark:text-gray-400" />
          }
        >
          <img src={profile()?.avatar} class="h-12 w-12" />
        </Show>
        <div class="flex flex-col flex-1 gap-1">
          <span class="whitxespace-nowrap font-semibold leading-4">
            {profile()?.fullName || `@${profile()?.username}`}
          </span>
          <Show when={profile()?.fullName}>
            <span class="whitespace-nowrap text-sm leading-3 text-gray-500 dark:text-gray-400">
              @{profile()?.username}
            </span>
          </Show>
        </div>
        <Tooltip text="Logout" class="mt-1">
          <IconButton
            path={mdiLogout}
            text="soft"
            class="m-0"
            variant="text"
            onClick={async () => {
              await fetch("/session/logout");
              setStorage({});
              navigateAndReload("/auth");
            }}
          />
        </Tooltip>
      </Card>
      <div class="flex justify-center items-center gap-2">
        <span class="flex-1 text-sm">Vrite ©2023</span>
        <Link href="https://discord.gg/4Z5MdEffBn">
          <IconButton path={discordIcon} badge text="soft" class="m-0" variant="text" />
        </Link>
        <Link href="https://github.com/vriteio/vrite">
          <IconButton path={mdiGithub} badge text="soft" class="m-0" variant="text" />
        </Link>
      </div>
    </div>
  );
};
const SidebarMenu: Component = () => {
  const { profile = () => null } = useAuthenticatedContext() || {};
  const [profileMenuOpened, setProfileMenuOpened] = createSignal(false);
  const { storage, setStorage } = useUIContext();
  const location = useLocation();
  const navigate = useNavigate();
  const hiddenLocations = ["auth"];
  const tooltipController = createTooltipController();
  const setSidePanelView = (view: string): void => {
    setStorage((storage) => ({
      ...storage,
      sidePanelWidth: storage.sidePanelWidth || 375,
      sidePanelView: view
    }));
  };
  const menuItems = (): Array<MenuItem | null> => [
    {
      icon: mdiViewDashboard,
      label: "Dashboard",
      active: () => location.pathname === "/",
      onClick: () => {
        navigate("/");
        if (storage().contentPieceId) setSidePanelView("contentPiece");
      }
    },
    {
      icon: mdiPencil,
      label: "Editor",
      active: () => location.pathname === "/editor",
      onClick: () => {
        navigate("/editor");
        if (storage().contentPieceId) setSidePanelView("contentPiece");
      }
    },
    null,
    {
      icon: mdiCog,
      label: "Settings",
      active: () => storage().sidePanelView === "settings",
      onClick: async () => {
        setSidePanelView("settings");
      }
    },
    {
      icon: mdiPuzzle,
      label: "Extensions",
      active: () => storage().sidePanelView === "extensions",
      onClick: async () => {
        setSidePanelView("extensions");
      }
    },
    {
      icon: mdiHexagonSlice6,
      label: "Switch Workspace",
      onClick: () => {
        navigate("/workspaces");
      }
    }
  ];

  return (
    <Show
      when={!hiddenLocations.some((hiddenLocation) => location.pathname.includes(hiddenLocation))}
    >
      <Card
        class="z-20 transition-all duration-300 m-0 rounded-0 border-t-0 border-l-0 border-b-0 w-[3.75rem] h-full"
        color="base"
        onTransitionEnd={() => tooltipController.updatePosition()}
      >
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-start mb-4">
            <IconButton
              path={logoIcon}
              color="primary"
              badge
              class="transition-all duration-300 bg-gradient-to-tr"
            />
          </div>
          <For each={menuItems()}>
            {(menuItem) => {
              return (
                <Show when={menuItem} fallback={<div class="flex-1" />}>
                  {(menuItem) => {
                    return (
                      <Tooltip text={menuItem().label} controller={tooltipController} side="right">
                        <Dynamic
                          component={menuItem()?.link ? Link : "div"}
                          href={menuItem().link || ""}
                          class="w-full"
                          target={menuItem()?.link?.startsWith("http") ? "_blank" : ""}
                        >
                          <IconButton
                            path={menuItem().icon}
                            variant="text"
                            color={menuItem().active?.() ? "primary" : "base"}
                            text={menuItem().active?.() ? "base" : "soft"}
                            onClick={menuItem()?.onClick}
                            {...(menuItem().props || {})}
                          />
                        </Dynamic>
                      </Tooltip>
                    );
                  }}
                </Show>
              );
            }}
          </For>
          <Dropdown
            activatorButton={() => (
              <Button variant="text" class="p-1">
                <Show
                  when={profile()?.avatar}
                  fallback={
                    <Icon
                      path={mdiAccountCircle}
                      class="h-6 w-6 text-gray-500 dark:text-gray-400"
                    />
                  }
                >
                  <img src={profile()?.avatar} class="h-6 w-6" />
                </Show>
              </Button>
            )}
            opened={profileMenuOpened()}
            setOpened={setProfileMenuOpened}
            placement="right-end"
          >
            <Show when={profileMenuOpened()}>
              <ProfileMenu close={() => setProfileMenuOpened(false)} />
            </Show>
          </Dropdown>
        </div>
      </Card>
    </Show>
  );
};

export { SidebarMenu };
