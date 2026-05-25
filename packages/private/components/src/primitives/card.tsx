import { Ref } from "../ref";
import clsx from "clsx";
import { Component, JSX, mergeProps, splitProps } from "solid-js";

const cardColors = {
  base: `:base: outline-gray-200 border-gray-200 bg-gray-50 dark:bg-gray-900 dark:outline-gray-700 dark:border-gray-700`,
  contrast: `:base: bg-gray-100 outline-gray-200 border-gray-200 dark:bg-gray-800 dark:outline-gray-700 dark:border-gray-700`,
  soft: `:base: bg-gray-200 outline-gray-300 border-gray-200 dark:bg-gray-700 dark:bg-opacity-30 dark:outline-gray-700 dark:border-gray-700`,
  primary: `:base: text-white bg-gradient-to-tr`
};

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  color?: keyof typeof cardColors;
  shade?: boolean;
  ref?: Ref<HTMLElement>[1];
}

const Card: Component<CardProps> = (providedProps) => {
  const props = mergeProps({ color: "base" } as Required<CardProps>, providedProps);
  const [, passedProps] = splitProps(props, ["class", "color", "children", "ref", "shade"]);

  return (
    <div
      {...passedProps}
      class={clsx(
        `:base: p-2 rounded-2xl`,
        props.shade && "shadow-[0_0_12px_0px] shadow-gray-200 dark:shadow-gray-900",
        props.color !== "primary" && "outline outline-1",
        cardColors[props.color],
        props.class
      )}
      ref={props.ref}
    >
      {props.children}
    </div>
  );
};

export { Card };
