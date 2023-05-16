import clsx from "clsx";
import { Component, JSX } from "solid-js";
import { Dynamic } from "solid-js/web";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
interface HeadingProps {
  children: JSX.Element;
  class?: string;
  level?: HeadingLevel;
}

const levelClassNames = {
  1: "text-2xl",
  2: "text-xl",
  3: "text-lg",
  4: "text-md",
  5: "text-sm",
  6: "text-xs"
};
const Heading: Component<HeadingProps> = (props) => {
  const tag = (): string => `h${props.level || 1}`;

  return (
    <Dynamic
      component={tag()}
      class={clsx(`:base: font-semibold`, levelClassNames[props.level || 1], props.class)}
    >
      {props.children}
    </Dynamic>
  );
};

export { Heading };
