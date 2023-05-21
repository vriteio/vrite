import clsx from "clsx";
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import type { Ref } from "#lib/ref";

const cardColors = {
  base: `:base: border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700`,
  contrast: `:base: bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700`,
  soft: `:base: bg-gray-200 border-gray-200 dark:bg-gray-700 dark:bg-opacity-30 dark:border-gray-700`,
  primary: `:base: text-white dark:text-white from-red-500 to-orange-500 bg-gradient-to-tr border-none`,
};

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  color?: keyof typeof cardColors;
  ref?: Ref<HTMLElement>[1];
}

const Card: Component<CardProps> = (providedProps) => {
  const props = mergeProps(
    { color: "base" } as Required<CardProps>,
    providedProps
  );
  const [, passedProps] = splitProps(props, [
    "class",
    "color",
    "children",
    "ref",
  ]);

  return (
    <div
      {...passedProps}
      class={clsx(
        `:base: p-2 m-1 border-2 rounded-2xl`,
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
