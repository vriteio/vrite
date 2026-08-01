import { Component, createUniqueId, JSX, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";
import { createRef, Ref } from "../ref";
import { Fragment } from "./fragment";

const inputColors = {
  base: `:base: bg-gray-200 dark:bg-gray-800 outline-gray-200 dark:outline-gray-800`,
  contrast: `:base: bg-white dark:bg-gray-850 outline-gray-200 dark:outline-gray-700 shadow-gray-200 dark:shadow-gray-900`
};
const inputVariants = {
  solid: `:base: focus:outline-none focus:shadow-inner`,
  outlined: `:base: outline outline-1 shadow-md focus:outline-1 focus:bg-gray-100 dark:focus:bg-gray-950`
};

interface InputProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "slot" | "onCancel"> {
  value?: string;
  class?: string;
  labelClass?: string;
  labelWrapperClass?: string;
  slotWrapperClass?: string;
  label?: string;
  size?: "xs" | "small" | "medium";
  color?: keyof typeof inputColors;
  variant?: keyof typeof inputVariants;
  ref?: Ref<HTMLInputElement>[1];
  slot?(): JSX.Element;
  setValue?(value: string): void;
  onEnter?(event: KeyboardEvent): void;
  onConfirm?(event: KeyboardEvent | FocusEvent): void;
  onCancel?(event: KeyboardEvent): void;
}

const inputSizes = {
  xs: {
    label: ":base: text-xs",
    input: ":base: h-6.5 max-h-6.5",
    field: ":base: p-0.5 px-1.5 text-sm"
  },
  small: {
    label: ":base: text-xs",
    input: ":base: h-7 max-h-7",
    field: ":base: p-1 px-2 text-sm"
  },
  medium: {
    label: ":base: text-sm",
    input: ":base: h-8 max-h-8",
    field: ":base: p-2"
  }
};
const Input: Component<InputProps> = (props) => {
  const [cancelled, setCancelled] = createRef(false);
  const [confirmed, setConfirmed] = createRef(false);
  const generatedID = createUniqueId();
  const inputID = () => props.id || generatedID;
  const [, passedProps] = splitProps(props, [
    "onEnter",
    "onConfirm",
    "onCancel",
    "onBlur",
    "onFocus",
    "class",
    "value",
    "setValue",
    "slot",
    "labelClass",
    "labelWrapperClass",
    "slotWrapperClass",
    "label",
    "color",
    "id",
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
          for={inputID()}
          class={clsx(
            ":base: leading-[1] text-gray-400 dark:text-gray-500 group-focus-within:text-gray-500 group-focus-within:dark:text-gray-400",
            inputSizes[props.size || "medium"].label,
            props.labelClass
          )}
        >
          {props.label}
        </label>
      </Show>
      <Dynamic
        component={props.slot ? "div" : Fragment}
        class={clsx(":base: flex items-center relative", props.slotWrapperClass)}
      >
        <input
          id={inputID()}
          ref={props.ref}
          class={clsx(
            `:base: flex items-center justify-start flex-1 rounded-lg ring-offset-1 placeholder:opacity-50`,
            inputSizes[props.size || "medium"].field,
            inputSizes[props.size || "medium"].input,
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
            if (!cancelled() && !confirmed()) {
              props.onConfirm?.(event);
            }

            if (typeof props.onBlur === "function") {
              props.onBlur?.(event);
            }

            setConfirmed(false);
            setCancelled(false);
          }}
          onKeyDown={(
            event: KeyboardEvent & { currentTarget: HTMLInputElement; target: Element }
          ) => {
            if (event.key === "Enter") {
              props.onEnter?.(event);
            }

            if (event.key === "Enter" && props.onConfirm) {
              props.onConfirm(event);
              setConfirmed(true);
              event.currentTarget.blur();
            }

            if (event.key === "Escape" && props.onCancel) {
              props.onCancel(event);
              setCancelled(true);
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

            props.setValue?.(event.currentTarget.value);
          }}
          {...passedProps}
        />
        <Show when={props.slot} keyed>
          {(slot) => <Dynamic component={slot} />}
        </Show>
      </Dynamic>
    </Dynamic>
  );
};

export { Input };
