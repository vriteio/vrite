import { IconButton, Shortcut, Tooltip } from "@andesine/components";
import { Component, For, Show } from "solid-js";
import clsx from "clsx";

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
  menu: MenuItem[];
  class?: string;
  direction?: "horizontal" | "vertical";
}

const Menu: Component<MenuProps> = (props) => {
  return (
    <div
      class={clsx(
        ":base: flex gap-1",
        props.direction === "vertical" && ":base: flex-col",
        props.class
      )}
    >
      <For each={props.menu}>
        {(item) => {
          return (
            <Show when={"separator" in item ? null : item} fallback={<div class="flex-1" />}>
              {(item) => {
                return (
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
                    side={props.direction === "vertical" ? "right" : "bottom"}
                    fixed
                  >
                    <IconButton
                      variant={item().active ? "solid" : "text"}
                      text={item().active ? undefined : "soft"}
                      color={item().active ? "primary" : undefined}
                      iconProps={{ class: "h-5 w-5" }}
                      onClick={item().onClick}
                    >
                      <div class="h-full w-full justify-center items-center flex">
                        <div class={clsx("h-5 w-5", item().icon)} />
                      </div>
                    </IconButton>
                  </Tooltip>
                );
              }}
            </Show>
          );
        }}
      </For>
    </div>
  );
};

export { Menu };
export type { MenuItem };
