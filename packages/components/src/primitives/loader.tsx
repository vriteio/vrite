import clsx from "clsx";
import { Component } from "solid-js";

const sizes = {
  small: `:base: w-4 h-4`,
  medium: `:base: w-6 h-6`,
  large: `:base: w-8 h-8`
};

interface LoaderProps {
  class?: string;
  size?: keyof typeof sizes;
  color?: "base" | "primary";
}

const Loader: Component<LoaderProps> = (props) => {
  return (
    <svg
      class={clsx(`animate-spin`, sizes[props.size || "medium"], props.class)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        class={props.color === "base" ? "opacity-75" : ""}
        fill={props.color === "primary" ? "url(#gradient)" : "currentColor"}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

export { Loader };
