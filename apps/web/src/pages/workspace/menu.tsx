import { IconButton, Shortcut, Tooltip } from "@andesine/components";
import { type Component, For, Show } from "solid-js";
import clsx from "clsx";

type MenuItem =
  | {
      label: string;
      icon: string;
      active?: boolean;
      link?: string;
      shortcut?: string;
      secondaryActionMenu?: boolean;
      onClick?: () => void;
    }
  | { separator: true };

interface MenuProps {
  menu: MenuItem[];
  class?: string;
  direction?: "horizontal" | "vertical";
  bottomNavigation?: boolean;
}

const Menu: Component<MenuProps> = (props) => (
  <div
    class={clsx(
      ":base: flex gap-1",
      props.direction === "vertical" && ":base: flex-col",
      props.bottomNavigation && "!contents",
      props.class
    )}
  >
    <For each={props.menu}>
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
                    <Shortcut class="opacity-50 font-mono text-[80%]" shortcut={item().shortcut!} />
                  )}
                </div>
              }
              side={props.direction === "vertical" ? "right" : "bottom"}
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
                    <div class="relative h-5 w-5">
                      <div
                        class={clsx(
                          "h-5 w-5 z-1",
                          item().active ? "bg-gradient-to-tr" : "text-gray-500",
                          item().icon
                        )}
                      />
                      <Show when={item().active && item().secondaryActionMenu}>
                        <div class="h-3 w-3 bg-gray-500/10 rounded-lg flex justify-center items-center absolute -right-1.5 -top-1.5">
                          <div class="i-lucide:chevron-up h-3 w-3 bg-gradient-to-tr" />
                        </div>
                      </Show>
                    </div>
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

export { Menu };
export type { MenuItem };
