import { Icon } from "./icon";
import clsx from "clsx";
import {
  Component,
  ComponentProps,
  JSX,
  mergeProps,
  Show,
  splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";

const buttonColors = {
  base: `:base: bg-gray-200 fill-current dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-700 disabled:hover:bg-gray-200 disabled:dark:hover:bg-gray-900`,
  contrast: `:base: bg-gray-100 fill-current dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:hover:bg-gray-100 disabled:dark:hover:bg-gray-800`,
  primary: `:base: bg-gradient-to-tr fill-[url(#gradient)] from-red-500 to-orange-500 hover:bg-gradient-to-bl hover:fill-current dark:hover:bg-orange-600 disabled:opacity-70 disabled:hover:bg-orange-500`,
};
const textColors = {
  base: `:base: text-gray-800 dark:text-gray-100`,
  contrast: `:base: text-gray-900 dark:text-gray-50`,
  primary: `:base: text-white fill-current`,
  soft: `:base: text-gray-500 dark:text-gray-400`,
};
const buttonSizes = {
  small: `:base: px-1 py-0.5 text-sm m-0.5 rounded-md`,
  medium: `:base: px-2 py-1 m-1 text-base rounded-lg`,
  large: `:base: px-4 py-2 m-1 text-lg rounded-lg`,
  xs: "",
};
const buttonVariants = {
  text: `:base-2: bg-transparent dark:bg-transparent`,
  solid: "",
};
const buttonColorsVariants = {
  primaryText: `:base-2: text-transparent bg-clip-text hover:bg-clip-border hover:text-white`,
};
const iconButtonSizes = {
  xs: { button: `:base: p-0`, icon: `:base: h-3 w-3`, label: `:base: p-0.5` },
  small: {
    button: `:base: p-0.5`,
    icon: `:base: w-4 h-4`,
    label: `:base: pl-1`,
  },
  medium: {
    button: `:base: p-1`,
    icon: `:base: w-6 h-6`,
    label: `:base: pl-2`,
  },
  large: { button: `:base: p-2`, icon: `:base: w-8 h-8`, label: `:base: pl-4` },
};

type ButtonColor = keyof typeof buttonColors;
type ButtonTextColor = keyof typeof textColors;
type ButtonVariant = keyof typeof buttonVariants;
type ButtonSize = keyof typeof buttonSizes;
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  class?: string;
  badge?: boolean;
  link?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  text?: ButtonTextColor;
  target?: string;
  href?: string;
}
interface IconButtonProps extends Omit<ButtonProps, "size"> {
  path?: string;
  iconProps?: Partial<ComponentProps<typeof Icon>>;
  label?: JSX.Element;
  size?: keyof typeof iconButtonSizes;
}

const Button: Component<ButtonProps> = (providedProps) => {
  const props = mergeProps(
    {
      color: "base",
      text: providedProps.color || "base",
      variant: "solid",
      size: "medium",
    } as const,
    providedProps
  );
  const [, passedProps] = splitProps(props, [
    "class",
    "color",
    "text",
    "variant",
    "size",
    "badge",
    "link",
    "children",
  ]);
  const getTag = () => {
    if (props.badge) return "div";
    if (props.link) return "a";

    return "button";
  };

  return (
    <Dynamic
      component={getTag()}
      class={clsx(
        `:base: transition duration-150 focus:outline-none`,
        props.badge && `:base: pointer-events-none`,
        buttonVariants[props.variant],
        buttonSizes[props.size],
        buttonColors[props.color],
        textColors[props.text],
        {
          [buttonColorsVariants.primaryText]:
            props.color === "primary" && props.variant === "text",
        },
        props.class
      )}
      {...(props.link ? { href: props.link } : {})}
      {...passedProps}
    >
      {props.children}
    </Dynamic>
  );
};
const IconButton: Component<IconButtonProps> = (providedProps) => {
  const props = mergeProps(
    {
      color: "base",
      text: providedProps.color || "base",
      variant: "solid",
      size: "medium",
    } as const,
    providedProps
  );
  const [, passedProps] = splitProps(props, ["path", "iconProps", "label"]);

  return (
    <Button
      {...passedProps}
      class={clsx(
        `:base: flex items-center justify-center`,
        iconButtonSizes[props.size].button,
        props.class
      )}
    >
      <Show
        when={props.path}
        fallback={
          <div class={iconButtonSizes[props.size].icon}>{props.children}</div>
        }
      >
        <Icon
          {...props.iconProps}
          path={props.path || ""}
          class={clsx(
            `:base: fill-inherit`,
            iconButtonSizes[props.size].icon,
            props.iconProps?.class
          )}
        />
      </Show>
      <Show when={props.label}>
        <span class={iconButtonSizes[props.size].label}>{props.label}</span>
      </Show>
    </Button>
  );
};

export { Button, IconButton };
