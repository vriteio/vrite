import clsx from "clsx";
import { Component, JSX, splitProps } from "solid-js";

interface IconProps extends JSX.SvgSVGAttributes<SVGSVGElement> {
  path: string;
  class?: string;
}

const Icon: Component<IconProps> = (props) => {
  const [, passedProps] = splitProps(props, ["class", "path"]);

  return (
    <svg
      viewBox="0 0 24 24"
      clip-rule="evenodd"
      fill-rule="evenodd"
      class={clsx(`:base: fill-current`, props.class)}
      {...passedProps}
    >
      <path d={props.path} />
    </svg>
  );
};

export { Icon };
