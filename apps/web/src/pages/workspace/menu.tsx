import { IconButton, Shortcut, Tooltip } from "@andesine/components";
import { type Component, For, Show } from "solid-js";
import clsx from "clsx";
import { useWorkspace } from "#web/context/workspace";
import { useLayout } from "#web/context/layout";
import { createMediaQuery } from "@solid-primitives/media";
import { type PrimaryPanel } from "./side-panel";

type MenuItem =
  | {
      label: string;
      icon: string;
      active?: boolean;
      link?: string;
      shortcut?: string;
      onClick?: () => void;
    }
  | { separator: true };

interface MenuProps {
  activePanel: PrimaryPanel;
  class?: string;
  direction?: "horizontal" | "vertical";
  bottomNavigation?: boolean;
  openSearch(): void;
  openPanel(panel: PrimaryPanel, currentEntryID?: string): void;
}

const Menu: Component<MenuProps> = (props) => {
  const { layout } = useLayout();
  const { currentWorkspace } = useWorkspace();
  const md = createMediaQuery("(min-width: 768px)");
  const menu: MenuItem[] = [
    {
      label: "Explorer",
      icon: "i-lucide:files",
      get active() {
        return props.activePanel === "explorer";
      },
      onClick() {
        props.openPanel("explorer", currentWorkspace()?.currentEntryID);
      }
    },
    {
      label: "Search",
      shortcut: "$mod+k",
      icon: "i-material-symbols:search-rounded",
      onClick: props.openSearch
    },
    { separator: true },
    {
      label: "Help",
      icon: "i-lucide:help-circle",
      get active() {
        return props.activePanel === "help" && (!md() || layout.leftSidePanelWidth > 0);
      },
      onClick() {
        props.openPanel("help");
      }
    },
    {
      label: "Settings",
      shortcut: "$mod+,",
      icon: "i-lucide:settings-2",
      get active() {
        return props.activePanel === "settings";
      },
      onClick() {
        props.openPanel("settings");
      }
    }
  ];

  return (
    <div
      class={clsx(
        ":base: flex gap-1",
        props.direction === "vertical" && ":base: flex-col",
        props.bottomNavigation && "!contents",
        props.class
      )}
    >
      <For each={menu}>
        {(item) => (
          <Show
            when={"separator" in item ? null : item}
            fallback={
              <Show when={!props.bottomNavigation}>
                <div class="flex-1" />
              </Show>
            }
          >
            {(item) => (
              <Tooltip
                content={
                  <div class="flex flex-col items-center justify-center gap-0.5">
                    <span>{item().label}</span>
                    {item().shortcut && (
                      <Shortcut
                        class="opacity-50 font-mono text-[80%]"
                        shortcut={item().shortcut!}
                      />
                    )}
                  </div>
                }
                placement={props.direction === "vertical" ? "right" : "bottom"}
                fixed
                wrapperClass={props.bottomNavigation ? "w-full h-full" : undefined}
              >
                <div
                  class={clsx(
                    "flex justify-center items-center relative",
                    props.bottomNavigation && "w-full h-full"
                  )}
                >
                  <Show when={item().active && !props.bottomNavigation}>
                    <div class="bg-gradient-to-tr opacity-10 h-full w-full absolute top-0 left-0 rounded-lg" />
                  </Show>
                  <Show
                    when={props.bottomNavigation}
                    fallback={
                      <IconButton
                        variant={item().active ? "solid" : "text"}
                        text={item().active ? "primary" : "soft"}
                        color={item().active ? "primary" : undefined}
                        iconProps={{ class: "h-5 w-5" }}
                        onClick={item().onClick}
                        icon={item().icon}
                      />
                    }
                  >
                    <button
                      type="button"
                      aria-label={item().label}
                      class={clsx(
                        "z-1 relative flex w-full items-center justify-center h-full @hover:bg-gray-200"
                      )}
                      onClick={item().onClick}
                    >
                      <div
                        class={clsx(
                          "h-5 w-5 z-1",
                          item().active ? "bg-gradient-to-tr" : "text-gray-500",
                          item().icon
                        )}
                      />
                    </button>
                  </Show>
                </div>
              </Tooltip>
            )}
          </Show>
        )}
      </For>
    </div>
  );
};

export { Menu };
