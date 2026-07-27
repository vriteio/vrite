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
                    <div class="flex justify-center items-center relative">
                      <Show when={item().active}>
                        <div class="bg-gradient-to-tr opacity-10 h-full w-full absolute top-0 left-0 rounded-lg" />
                      </Show>
                      <IconButton
                        variant={item().active ? "solid" : "text"}
                        text={item().active ? "primary" : "soft"}
                        color={item().active ? "primary" : undefined}
                        iconProps={{ class: "h-5 w-5" }}
                        onClick={item().onClick}
                        icon={item().icon}
                      />
                    </div>
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
