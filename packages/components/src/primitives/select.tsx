import clsx from "clsx";
import { For, JSX, Show, splitProps } from "solid-js";

interface SelectOption<V extends string = string> {
  label: string;
  value: V;
}
interface SelectProps<V extends string = string>
  extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<SelectOption<V>>;
  value: string;
  class?: string;
  placeholder?: string;
  color?: "base" | "contrast";
  wrapperClass?: string;
  setValue(value: V): void;
}

const selectColors = {
  base: ":base: bg-gray-200 dark:bg-gray-900",
  contrast: `:base: bg-gray-200 dark:bg-gray-800`
};
const Select = <V extends string = string>(props: SelectProps<V>): JSX.Element => {
  const [, passedProps] = splitProps(props, [
    "options",
    "class",
    "value",
    "placeholder",
    "setValue"
  ]);
  const handleChange: JSX.EventHandlerUnion<HTMLSelectElement, Event> = (event) => {
    props.setValue(event.currentTarget.value as V);
    event.currentTarget.value = props.value;

    if (typeof props.onChange === "function") {
      props.onChange?.(event as any);
    }
  };

  return (
    <div class={clsx(":base: relative flex items-center justify-center", props.wrapperClass)}>
      <select
        required
        value={props.value}
        onChange={handleChange}
        class={clsx(
          `:base: py-1 pl-2 m-1 text-base border-0 rounded-lg pr-9 form-select focus:outline-none focus:ring-0 invalid:text-gray-400 h-8`,
          selectColors[props.color || "base"],
          props.class
        )}
        {...passedProps}
      >
        <Show when={props.placeholder}>
          <option
            disabled
            selected={!props.value || !props.options.find((option) => option.value === props.value)}
            value=""
          >
            {props.placeholder}
          </option>
        </Show>
        <For each={props.options}>
          {(option) => {
            return (
              <option value={option.value} selected={option.value === props.value}>
                {option.label}
              </option>
            );
          }}
        </For>
      </select>
    </div>
  );
};

export { Select };
