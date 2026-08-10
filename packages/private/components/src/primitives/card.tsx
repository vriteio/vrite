import { type Ref } from "../ref";
import clsx from "clsx";
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";

const cardColors = {
  base: `:base: border-gray-200 bg-gray-50`,
  contrast: `:base: bg-gray-100 border-gray-200`,
  soft: `:base: bg-gray-200 border-gray-300`,
  primary: `:base: text-white bg-gradient-to-tr`
};

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  style?: JSX.CSSProperties;
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
        `:base: p-2 rounded-2xl outline-none`,
        props.shade && ":base: shadow-[0_0_12px_0px] shadow-gray-200",
        props.color !== "primary" && ":base: border",
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
