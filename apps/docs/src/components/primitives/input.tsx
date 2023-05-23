import clsx from "clsx";
import { Component, JSX, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { Ref } from "#lib/ref";

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  class?: string;
  editable?: boolean;
  value: string;
  wrapperClass?: string;
  ref?: Ref<HTMLInputElement>[1];
  adornment?(): JSX.Element;
  setValue(value: string): void;
  onEnter?(value: string): void;
}

const Input: Component<InputProps> = (props) => {
  const [, passedProps] = splitProps(props, [
    "class",
    "children",
    "value",
    "setValue",
    "adornment",
    "wrapperClass",
  ]);
  const editable = (): boolean =>
    typeof props.editable === "boolean" ? props.editable : true;

  return (
    <div class={clsx("flex items-center", props.wrapperClass)}>
      <Dynamic
        ref={props.ref}
        component={editable() ? "input" : "div"}
        {...passedProps}
        class={clsx(
          `:base: flex items-center justify-start flex-1 p-2 m-1 bg-gray-200 rounded-lg h-9 ring-offset-1 dark:text-white dark:bg-gray-900 focus:outline-none focus:border-orange-500 placeholder:text-gray-400`,
          props.class
        )}
        value={props.value}
        onKeyUp={(
          event: KeyboardEvent & {
            currentTarget: HTMLInputElement;
            target: Element;
          }
        ) => {
          if (typeof props.onKeyUp === "function") {
            props.onKeyUp?.(event);
          }

          if (event.key === "Enter") {
            props.onEnter?.(props.value);
          }
        }}
        onInput={(
          event: InputEvent & {
            currentTarget: HTMLInputElement;
            target: Element;
          }
        ) => {
          if (typeof props.onInput === "function") {
            props.onInput?.(event);
          }

          props.setValue(event.currentTarget.value);
        }}
      >
        {!editable() && props.value}
      </Dynamic>
      <Show when={props.adornment}>
        <Dynamic component={props.adornment!} />
      </Show>
    </div>
  );
};

export { Input };
