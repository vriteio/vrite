import {
  mdiViewDashboard,
  mdiCog,
  mdiLogout,
  mdiPencil,
  mdiGithub,
  mdiHexagonSlice6,
  mdiAccountCircle,
  mdiHelpCircle,
  mdiPuzzle,
  mdiMicrosoftXboxControllerMenu,
  mdiGit,
  mdiFile,
  mdiMagnify,
  mdiFileMultiple
} from "@mdi/js";
import {
  Accessor,
  Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on
} from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import clsx from "clsx";
import { createMediaQuery } from "@solid-primitives/media";
import { createActiveElement } from "@solid-primitives/active-element";
import { breakpoints, navigateAndReload } from "#lib/utils";
import {
  useLocalStorage,
  useAuthenticatedUserData,
  useCommandPalette,
  useHostConfig,
  useContentData
} from "#context";
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
  props?: Record<string, string>;
  inMenu?: boolean;
  active?: () => boolean;
  onClick(): void;
}

const useMenuItems = (): Accessor<Array<MenuItem | null>> => {
  const { storage, setStorage } = useLocalStorage();
  const commandPalette = useCommandPalette();
  const { activeContentPieceId } = useContentData();
  const hostConfig = useHostConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const md = createMediaQuery("(min-width: 768px)");
  const setSidePanelView = (view: string): void => {
    setStorage((storage) => ({
      ...storage,
      sidePanelWidth: storage.sidePanelWidth || 375,
      sidePanelView: view
    }));
  };
  const switchRightPanel = (): void => {
    setStorage((storage) => ({ ...storage, rightPanelWidth: storage.rightPanelWidth ? 0 : 375 }));
  };
  const pathnameData = createMemo(() => {
    const pathRegex = /^\/(?:editor\/?)?([a-f\d]{24})?$/i;
    const match = location.pathname.match(pathRegex);

    if (!match) return {};

    return {
      activeContentPieceId: match[1],
      view: match[0].includes("editor") ? "editor" : "dashboard"
    };
  });

  return () => {
    return [
      {
        icon: mdiViewDashboard,
        label: "Dashboard",
        active: () => {
          return (
            pathnameData().view === "dashboard" &&
            (md() ||
              (!(storage().sidePanelView && storage().sidePanelWidth) &&
                !storage().rightPanelWidth))
          );
        },
        onClick: () => {
          navigate(`/${activeContentPieceId() || ""}`);

          if (activeContentPieceId() && md() && pathnameData().view === "dashboard") {
            setSidePanelView("contentPiece");
          }

          if (!md()) setStorage((storage) => ({ ...storage, sidePanelWidth: 0 }));
        }
      },
      {
        icon: mdiPencil,
        label: "Editor",
        active: () => {
          return (
            pathnameData().view === "editor" &&
            (md() ||
              (!(storage().sidePanelView && storage().sidePanelWidth) &&
                !storage().rightPanelWidth))
          );
        },
        onClick: () => {
          navigate(`/editor/${activeContentPieceId() || ""}`);

          if (!md()) setStorage((storage) => ({ ...storage, sidePanelWidth: 0 }));
        }
      },
      null,
      activeContentPieceId() && {
        icon: mdiFile,
        label: "Content piece",
        inMenu: true,
        active: () => storage().sidePanelView === "contentPiece",
        onClick: () => {
          setSidePanelView("contentPiece");
        }
      },
      !breakpoints.md() && {
        icon: mdiMagnify,
        label: "Search",
        onClick: () => {
          // Force mobile keyboard to open (focus must be in user-triggered event handler)
          document.getElementById("command-palette-input")?.focus({ preventScroll: true });
          commandPalette.open();
        }
      },
      !breakpoints.md() && {
        icon: mdiFileMultiple,
        label: "Explorer",
        active: () => Number(storage().rightPanelWidth || 0) > 0,
        onClick: () => {
          switchRightPanel();
        }
      },
      hostConfig.githubApp && {
        icon: mdiGit,
        label: "Source control",
        inMenu: true,
        active: () => storage().sidePanelView === "git",
        onClick: () => {
          setSidePanelView("git");
        }
      },
      {
        icon: mdiCog,
        label: "Settings",
        inMenu: true,
        active: () => storage().sidePanelView === "settings",
        onClick: () => {
          setSidePanelView("settings");
        }
      },
      hostConfig.extensions && {
        icon: mdiPuzzle,
        label: "Extensions",
        inMenu: true,
        active: () => storage().sidePanelView === "extensions",
        onClick: () => {
          setSidePanelView("extensions");
        }
      },
      {
        icon: mdiHelpCircle,
        label: "Help",
        inMenu: true,
        active: () => storage().sidePanelView === "default",
        onClick: () => {
          setSidePanelView("default");
        }
      }
    ].filter((value) => value !== false) as Array<MenuItem | null>;
  };
};
const ProfileMenu: Component<{ close(): void }> = (props) => {
  const { profile, workspace } = useAuthenticatedUserData();
  const { setStorage } = useLocalStorage();
  const menuItems = useMenuItems();

  return (
    <div class="flex flex-col min-w-xs p-2 pb-1 md:p-1 gap-2">
      <div class="flex justify-center items-center">
        <Heading level={2} class="flex-1">
          Profile
        </Heading>
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
        <Tooltip text="Logout" class="mt-1" fixed>
          <IconButton
            path={mdiLogout}
            text="soft"
            class="m-0"
            variant="text"
            onClick={async () => {
              await fetch("/session/logout", { method: "POST" });
              setStorage({});
              navigateAndReload("/auth");
            }}
          />
        </Tooltip>
      </Card>
      <Card class="flex flex-col md:hidden w-full gap-2 m-0" color="contrast">
        <For each={menuItems()}>
          {(menuItem) => {
            if (!menuItem || !menuItem.inMenu) return null;

            return (
              <IconButton
                class="m-0 justify-start"
                path={menuItem.icon}
                label={menuItem.label}
                onClick={() => {
                  menuItem.onClick?.();
                  props.close();
                }}
                variant="text"
                color="contrast"
                text="soft"
              />
            );
          }}
        </For>
      </Card>
      <div class="flex justify-center items-center gap-2">
        <div class="flex flex-1">
          <Icon path={mdiHexagonSlice6} class="h-5 min-w-5 mr-1 text-gray-500 dark:text-gray-400" />
          <span class="text-sm clamp-1">{workspace()?.name}</span>
        </div>
        <a href="https://discord.gg/4Z5MdEffBn" target="_blank">
          <IconButton path={discordIcon} badge text="soft" class="m-0" variant="text" />
        </a>
        <a href="https://github.com/vriteio/vrite" target="_blank">
          <IconButton path={mdiGithub} badge text="soft" class="m-0" variant="text" />
        </a>
      </div>
    </div>
  );
};
const SidebarMenu: Component = () => {
  const { profile } = useAuthenticatedUserData();
  const { storage } = useLocalStorage();
  const { registerCommand } = useCommandPalette();
  const activeElement = createActiveElement();
  const [profileMenuOpened, setProfileMenuOpened] = createSignal(false);
  const [hideMenu, setHideMenu] = createSignal(false);
  const location = useLocation();
  const hiddenLocations = ["auth"];
  const tooltipController = createTooltipController();
  const menuItems = useMenuItems();

  createEffect(
    on(activeElement, (activeElement) => {
      setTimeout(() => {
        const dataState = activeElement?.getAttribute("data-state");
        const pmContainer = document.getElementById("pm-container");

        if (breakpoints.md() || !pmContainer || dataState === "hidden") {
          setHideMenu(false);

          return;
        }

        setHideMenu(pmContainer.contains(activeElement));
      }, 0);
    })
  );
  createEffect(() => {
    if (hideMenu()) {
      document.documentElement.classList.add("sidebar-hidden");
    } else {
      document.documentElement.classList.remove("sidebar-hidden");
    }
  });
  createEffect(() => {
    registerCommand(
      menuItems()
        .filter(Boolean)
        .map((menuItem) => ({
          name: menuItem!.label,
          action() {
            menuItem!.onClick();
          },
          icon: menuItem!.icon,
          category: "navigate"
        }))
    );
  });

  return (
    <Show
      when={!hiddenLocations.some((hiddenLocation) => location.pathname.includes(hiddenLocation))}
    >
      <Card
        class={clsx(
          "flex justify-center items-center box-content fixed z-50 p-0 h-[calc(env(safe-area-inset-bottom,0)+3.625rem)] transition-all duration-300 m-0 rounded-0 border-0 border-t-2 md:border-t-0 md:border-r-2 w-full md:w-[calc(3.25rem+env(safe-area-inset-left,0px))] pl-[calc(env(safe-area-inset-left,0px))] md:h-full relative bottom-0 md:bottom-unset",
          hideMenu() && "hidden"
        )}
        color="base"
        onTransitionEnd={() => tooltipController.updatePosition()}
      >
        <div class="flex md:flex-col h-full w-full lg:w-10 lg:py-1.5">
          <div class="flex items-center justify-center md:mb-4">
            <IconButton
              path={logoIcon}
              color="primary"
              badge
              class="transition-all duration-300 bg-gradient-to-tr hidden md:block"
            />
          </div>
          <For each={menuItems()}>
            {(menuItem) => {
              return (
                <Show when={menuItem} fallback={<div class="hidden md:block flex-1" />}>
                  {(menuItem) => {
                    return (
                      <Tooltip
                        text={menuItem().label}
                        controller={tooltipController}
                        side="right"
                        wrapperClass={clsx(
                          "flex-1 md:flex-none",
                          menuItem().inMenu && "hidden md:flex"
                        )}
                      >
                        <button
                          class="w-full h-full md:h-auto md:w-auto relative group overflow-hidden m-0 md:m-1"
                          onClick={menuItem()?.onClick}
                        >
                          <IconButton
                            path={menuItem().icon}
                            variant="text"
                            badge
                            color={menuItem().active?.() ? "primary" : "base"}
                            text={menuItem().active?.() ? "base" : "soft"}
                            class="rounded-none md:rounded-lg w-full m-0 flex-col h-full pb-[calc(env(safe-area-inset-bottom,0)+0.25rem)] md:pb-1 md:h-auto md:w-auto"
                            label={
                              <span class="md:hidden text-xs mt-1 font-semibold">
                                {menuItem().label}
                              </span>
                            }
                            {...(menuItem().props || {})}
                          />
                        </button>
                      </Tooltip>
                    );
                  }}
                </Show>
              );
            }}
          </For>
          <Dropdown
            class="flex-1 md:flex-none"
            activatorWrapperClass="w-full h-full md:h-auto flex justify-center items-center"
            activatorButton={() => {
              const active = (): boolean => {
                return Boolean(
                  storage().sidePanelView && storage().sidePanelWidth && !breakpoints.md()
                );
              };

              return (
                <Button
                  class="group rounded-none md:rounded-lg p-1 w-full h-full pb-[calc(env(safe-area-inset-bottom,0)+0.25rem)] md:pb-1 md:h-auto md:w-auto flex justify-center items-center flex-col m-0 md:m-1"
                  variant="text"
                  text="soft"
                  color={active() ? "primary" : "base"}
                >
                  <div class="relative">
                    <Show
                      when={profile()?.avatar}
                      fallback={
                        <Icon
                          path={mdiAccountCircle}
                          class="h-6 w-6 text-gray-500 dark:text-gray-400"
                        />
                      }
                    >
                      <img src={profile()?.avatar} class="h-6 w-6 rounded-full" />
                    </Show>
                    <IconButton
                      path={mdiMicrosoftXboxControllerMenu}
                      variant="text"
                      badge
                      hover={false}
                      color={
                        storage().sidePanelView && storage().sidePanelWidth ? "primary" : "base"
                      }
                      text="soft"
                      size="small"
                      class=" md:hidden absolute -right-2 -bottom-2 m-0"
                    />
                  </div>
                  <span class="md:hidden text-xs mt-1 font-semibold">Menu</span>
                </Button>
              );
            }}
            opened={profileMenuOpened()}
            setOpened={setProfileMenuOpened}
            placement="right-end"
          >
            <ProfileMenu close={() => setProfileMenuOpened(false)} />
          </Dropdown>
        </div>
      </Card>
    </Show>
  );
};

export { SidebarMenu };
