import clsx from "clsx";
import { Component, JSX, splitProps } from "solid-js";

interface CheckboxProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  checked: boolean;
  class?: string;
  setChecked(value: boolean): void;
}

const Checkbox: Component<CheckboxProps> = (props) => {
  const [, passedProps] = splitProps(props, ["checked", "setChecked", "class"]);

  return (
    <input
      type="checkbox"
      class={clsx("form-checkbox", props.class)}
      checked={props.checked}
      onChange={(event) => props.setChecked(event.currentTarget.checked)}
      {...passedProps}
    />
  );
};

export { Checkbox };
