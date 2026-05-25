import { Component, createSignal, JSX, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";
import { Ref } from "../ref";
import { Fragment } from "./fragment";

const inputColors = {
  base: `:base: bg-gray-200 dark:bg-gray-800 outline-gray-200 dark:outline-gray-800`,
  contrast: `:base: bg-white dark:bg-gray-850 outline-gray-200 dark:outline-gray-700 shadow-gray-200 dark:shadow-gray-900`
};
const inputVariants = {
  solid: `:base: focus:outline-none focus:shadow-inner`,
  outlined: `:base: outline outline-1 shadow-md focus:outline-1 focus:bg-gray-100 dark:focus:bg-gray-950`
};

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  class?: string;
  labelClass?: string;
  labelWrapperClass?: string;
  adornmentWrapperClass?: string;
  textarea?: boolean;
  autoResize?: boolean;
  label?: string;
  size?: "small" | "medium";
  color?: keyof typeof inputColors;
  variant?: keyof typeof inputVariants;
  ref?: Ref<HTMLInputElement>[1];
  adornment?(): JSX.Element;
  setValue?(value: string): void;
  onEnter?(event: KeyboardEvent): void;
}

const Input: Component<InputProps> = (props) => {
  const [focused, setFocused] = createSignal(false);
  const [, passedProps] = splitProps(props, [
    "onEnter",
    "onBlur",
    "onFocus",
    "class",
    "value",
    "setValue",
    "adornment",
    "labelClass",
    "labelWrapperClass",
    "adornmentWrapperClass",
    "autoResize",
    "color",
    "ref",
    "variant",
    "size"
  ]);

  return (
    <Dynamic
      component={props.label ? "div" : Fragment}
      class={clsx(":base: flex flex-col gap-1 group", props.labelWrapperClass)}
    >
      <Show when={props.label}>
        <label
          class={clsx(
            ":base: leading-[1]",
            props.size === "small" ? ":base: text-xs" : ":base: text-sm",
            focused()
              ? ":base: text-gray-500 dark:text-gray-400"
              : ":base: text-gray-400 dark:text-gray-500",
            props.labelClass
          )}
        >
          {props.label}
        </label>
      </Show>
      <Dynamic
        component={props.adornment ? "div" : Fragment}
        class={clsx(":base: flex items-center relative", props.adornmentWrapperClass)}
      >
        <Dynamic
          ref={props.ref}
          component={props.textarea ? "textarea" : "input"}
          class={clsx(
            `:base: flex items-center justify-start flex-1 rounded-lg ring-offset-1 placeholder:opacity-50`,
            props.size === "small" ? ":base: p-1 px-2 text-sm" : ":base: p-2",
            !props.textarea &&
              (props.size === "small" ? ":base: h-7 max-h-7" : ":base: h-8 max-h-8"),
            props.textarea && ":base: min-h-16",
            inputColors[props.color || "base"],
            inputVariants[props.variant || "solid"],
            props.class
          )}
          value={props.value}
          onFocus={(
            event: FocusEvent & {
              currentTarget: HTMLInputElement;
              target: HTMLInputElement;
            }
          ) => {
            setFocused(true);
            if (typeof props.onFocus === "function") {
              props.onFocus?.(event);
            }
          }}
          onBlur={(
            event: FocusEvent & {
              currentTarget: HTMLInputElement;
              target: HTMLInputElement;
            }
          ) => {
            setFocused(false);
            if (typeof props.onBlur === "function") {
              props.onBlur?.(event);
            }
          }}
          onKeyDown={(
            event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }
          ) => {
            if (event.key === "Enter") {
              props.onEnter?.(event);
            }
            if (event.key === "Escape") {
              event.currentTarget.blur();
            }

            if (typeof props.onKeyDown === "function") {
              props.onKeyDown(event);
            }
          }}
          onInput={(
            event: InputEvent & {
              currentTarget: HTMLInputElement;
              target: HTMLInputElement;
            }
          ) => {
            if (typeof props.onInput === "function") {
              props.onInput?.(event);
            }

            if (props.autoResize) {
              event.currentTarget.style.height = "0px";
              event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            }

            props.setValue?.(event.currentTarget.value);
          }}
          {...passedProps}
        />
        <Show when={props.adornment} keyed>
          {(adornment) => <Dynamic component={adornment} />}
        </Show>
      </Dynamic>
    </Dynamic>
  );
};

export { Input };
