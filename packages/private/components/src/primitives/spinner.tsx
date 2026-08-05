import clsx from "clsx";
import { type Component } from "solid-js";

const sizes = {
  small: `:base: w-4 h-4`,
  medium: `:base: w-6 h-6`,
  large: `:base: w-8 h-8`
};

interface SpinnerProps {
  class?: string;
  size?: keyof typeof sizes;
  color?: "base" | "primary";
}

const Spinner: Component<SpinnerProps> = (props) => (
  <div
    class={clsx(
      ":base: i-svg-spinners:ring-resize",
      props.color === "primary" && `:base: bg-gradient-to-tr`,
      sizes[props.size || "medium"],
      props.class
    )}
  />
);

export { Spinner };
