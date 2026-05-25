import { ToggleGroup as BaseToggleGroup } from "@ark-ui/solid/toggle-group";
import clsx from "clsx";
import { Component, For, JSX, Show } from "solid-js";

interface ToggleGroupOption {
  value: string;
  label: JSX.Element;
  icon?: string;
}

interface ToggleGroupProps {
  value: string | string[];
  setValue(value: string | string[]): void;
  options: ToggleGroupOption[];
  multiple?: boolean;
  disabled?: boolean;
  class?: string;
  itemClass?: string;
}

const ToggleGroup: Component<ToggleGroupProps> = (props) => {
  return (
    <BaseToggleGroup.Root
      value={Array.isArray(props.value) ? props.value : props.value ? [props.value] : []}
      multiple={props.multiple}
      disabled={props.disabled}
      onValueChange={(details) => {
        props.setValue(props.multiple ? details.value : (details.value[0] ?? ""));
      }}
      class={clsx(
        "flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-900",
        props.class
      )}
    >
      <For each={props.options}>
        {(option) => (
          <BaseToggleGroup.Item
            value={option.value}
            class={clsx(
              "group/toggle relative flex items-center justify-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-gray-500 outline-none transition-all hover:text-gray-700 data-[focus]:ring-0 data-[state=on]:text-white dark:text-gray-400 dark:hover:text-gray-200",
              props.itemClass
            )}
          >
            <div class="absolute inset-0 -z-10 rounded-lg bg-gradient-to-tr opacity-0 transition-opacity group-data-[state=on]/toggle:opacity-100" />
            <div class="absolute inset-px -z-10 rounded-[calc(0.5rem-1px)] bg-white opacity-0 transition-opacity group-data-[state=on]/toggle:opacity-0 dark:bg-gray-800" />
            <Show when={option.icon}>
              <div
                class={clsx(
                  "h-4 w-4 text-current",
                  option.icon,
                  "group-data-[state=on]/toggle:text-white"
                )}
              />
            </Show>
            <span>{option.label}</span>
          </BaseToggleGroup.Item>
        )}
      </For>
    </BaseToggleGroup.Root>
  );
};

export { ToggleGroup };
export type { ToggleGroupOption, ToggleGroupProps };
