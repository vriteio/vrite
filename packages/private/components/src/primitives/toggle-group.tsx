import { ToggleGroup as BaseToggleGroup } from "@ark-ui/solid/toggle-group";
import clsx from "clsx";
import { type Component, For, type JSX, Match, Switch } from "solid-js";

interface ToggleGroupOption {
  value: string;
  label?: JSX.Element;
  icon?: string;
}

interface ToggleGroupProps {
  value: string | string[];
  setValue(value: string | string[]): void;
  options: ToggleGroupOption[];
  multiple?: boolean;
  disabled?: boolean;
  wrapperClass?: string;
  itemClass?: string;
  iconClass?: string;
}

const ToggleGroup: Component<ToggleGroupProps> = (props) => (
  <BaseToggleGroup.Root
    value={Array.isArray(props.value) ? props.value : props.value ? [props.value] : []}
    multiple={props.multiple}
    disabled={props.disabled}
    onValueChange={(details) => {
      props.setValue(props.multiple ? details.value : (details.value[0] ?? ""));
    }}
    class={clsx(
      ":base: flex items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400 p-1 gap-1",
      props.wrapperClass
    )}
  >
    <For each={props.options}>
      {(option) => {
        const active = () => {
          return Array.isArray(props.value)
            ? props.value.includes(option.value)
            : props.value === option.value;
        };

        return (
          <BaseToggleGroup.Item
            value={option.value}
            class={clsx(
              ":base: relative flex items-center justify-center gap-1 rounded-md font-medium text-gray-700 whitespace-nowrap",
              active()
                ? ":base: bg-white outline-gray-200 outline outline-1 shadow-md"
                : ":base: focus:outline-none @hover:bg-gray-50 focus:bg-gray-50",
              option.label ? ":base: px-1.5 py-0.5" : ":base: p-1",
              props.itemClass
            )}
          >
            <Switch>
              <Match when={option.icon}>
                <div
                  class={clsx(
                    ":base: relative h-4.5 w-4.5 text-current",
                    props.iconClass,
                    option.icon
                  )}
                />
              </Match>
              <Match when={option.label}>{option.label}</Match>
            </Switch>
          </BaseToggleGroup.Item>
        );
      }}
    </For>
  </BaseToggleGroup.Root>
);

export { ToggleGroup };
export type { ToggleGroupOption, ToggleGroupProps };
