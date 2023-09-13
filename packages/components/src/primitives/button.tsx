import { Icon } from "./icon";
import { Loader } from "./loader";
import clsx from "clsx";
import { Component, ComponentProps, JSX, mergeProps, Show, splitProps, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

const buttonColors = {
  base: `:base: bg-gray-200 fill-current dark:bg-gray-900`,
  contrast: `:base: bg-gray-200 fill-current dark:bg-gray-800`,
  danger: `:base: bg-red-500 fill-current dark:bg-red-500 disabled:opacity-70`,
  success: `:base: bg-green-500 fill-current dark:bg-green-500 disabled:opacity-70`,
  primary: `:base: bg-gradient-to-tr fill-[url(#gradient)] disabled:opacity-70`
};
const buttonColorsHover = {
  base: `:base: @hover-bg-gray-300 dark:@hover-bg-gray-700`,
  contrast: `:base: @hover-bg-gray-300 dark:@hover-bg-gray-700`,
  danger: `:base: @hover-bg-red-600 dark:@hover-bg-red-600 @hover-fill-current`,
  success: `:base: @hover-bg-green-600 dark:@hover-bg-green-600 @hover-fill-current`,
  primary: `:base: @hover-bg-gradient-to-bl @hover-fill-current`
};
const textColors = {
  base: `:base: text-gray-700 dark:text-gray-100`,
  contrast: `:base: text-gray-900 dark:text-gray-50`,
  primary: `:base: text-white fill-current`,
  danger: `:base: text-white fill-current`,
  success: `:base: text-white fill-current`,
  soft: `:base: text-gray-500 dark:text-gray-400`
};
const buttonSizes = {
  small: `:base: px-1 py-0.5 text-sm m-0.5 rounded-md`,
  medium: `:base: px-2 py-1 m-1 text-base rounded-lg`,
  large: `:base: px-4 py-2 m-1 text-lg rounded-lg`
};
const buttonVariants = {
  text: `:base-2: bg-transparent dark:bg-transparent`,
  solid: ""
};
const buttonColorsVariants = {
  primaryText: ` :base-2: font-bold text-transparent bg-clip-text dark:text-transparent dark:bg-clip-text`,
  dangerText: ` :base-2: text-red-500 dark:text-red-500`,
  successText: ` :base-2: text-green-500 dark:text-green-500`
};
const buttonColorsVariantsHover = {
  primaryText: ` :base-2: @hover-font-medium @hover-text-current @hover-bg-clip-border @hover-text-white dark:@hover-text-current dark:@hover-bg-clip-border dark:@hover-text-white`,
  dangerText: ` :base-2: @hover-font-medium @hover-text-white @hover-bg-red-600 dark:@hover-bg-red-600 dark:@hover-text-white`,
  successText: ` :base-2: @hover-font-medium @hover-text-white @hover-bg-green-600 dark:@hover-bg-green-600 dark:@hover-text-white`
};
const iconButtonSizes = {
  small: {
    button: `:base-2: p-0.5`,
    icon: `:base-2: w-4 h-4`,
    label: `:base-2: pl-0.5`
  },
  medium: {
    button: `:base-2: p-1`,
    icon: `:base-2: w-6 h-6`,
    label: `:base-2: pl-1`
  },
  large: {
    button: `:base-2: p-2`,
    icon: `:base-2: w-8 h-8`,
    label: `:base-2: pl-2`
  }
};

type ButtonColor = keyof typeof buttonColors;
type ButtonTextColor = keyof typeof textColors;
type ButtonVariant = keyof typeof buttonVariants;
type ButtonSize = keyof typeof buttonSizes;
interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  class?: string;
  badge?: boolean;
  hover?: boolean;
  link?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  text?: ButtonTextColor;
  loading?: boolean;
  target?: string;
}
interface IconButtonProps extends ButtonProps {
  path?: string;
  iconProps?: Partial<ComponentProps<typeof Icon>>;
  label?: string | JSX.Element;
}

const Button: Component<ButtonProps> = (providedProps) => {
  const props = mergeProps(
    {
      color: "base",
      text: providedProps.color || "base",
      variant: "solid",
      size: "medium"
    } as const,
    providedProps
  );
  const [, passedProps] = splitProps(props, [
    "class",
    "disabled",
    "color",
    "text",
    "variant",
    "size",
    "link",
    "badge",
    "children"
  ]);
  const component = createMemo(() => {
    if (props.link) return "a";
    if (props.badge) return "div";

    return "button";
  });

  return (
    <Dynamic
      component={component()}
      class={clsx(
        `:base: transition relative duration-150 !outline-none !ring-0 focus:!outline-none focus:!ring-0`,
        !props.badge && ":base: cursor-pointer",
        buttonVariants[props.variant],
        buttonSizes[props.size],
        buttonColors[props.color],
        textColors[props.text],
        props.hover !== false && buttonColorsHover[props.color],
        {
          [buttonColorsVariants.primaryText]: props.color === "primary" && props.variant === "text",
          [buttonColorsVariants.dangerText]: props.color === "danger" && props.variant === "text",
          [buttonColorsVariants.successText]: props.color === "success" && props.variant === "text",
          [buttonColorsVariantsHover.primaryText]:
            props.color === "primary" && props.variant === "text" && props.hover !== false,
          [buttonColorsVariantsHover.dangerText]:
            props.color === "danger" && props.variant === "text" && props.hover !== false,
          [buttonColorsVariantsHover.successText]:
            props.color === "success" && props.variant === "text" && props.hover !== false
        },
        props.class
      )}
      disabled={props.disabled || props.loading}
      href={props.link}
      {...passedProps}
    >
      <div class={clsx("contents", props.loading && "invisible")}>{props.children}</div>
      <Show when={props.loading}>
        <div class="flex justify-center items-center absolute w-full h-full p-1.5 top-0 left-0">
          <Loader class="h-full fill-inherit" />
        </div>
      </Show>
    </Dynamic>
  );
};
const IconButton: Component<IconButtonProps> = (providedProps) => {
  const props = mergeProps(
    {
      color: "base",
      text: providedProps.color || "base",
      variant: "solid",
      size: "medium"
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
        fallback={<div class={iconButtonSizes[props.size].icon}>{props.children}</div>}
      >
        <Icon
          {...props.iconProps}
          path={props.path || ""}
          class={clsx(
            `:base-2: fill-inherit`,
            iconButtonSizes[props.size].icon,
            props.iconProps?.class
          )}
        />
      </Show>
      <Show when={props.label}>
        {typeof props.label === "string" ? (
          <span class={iconButtonSizes[props.size].label}>{props.label}</span>
        ) : (
          props.label
        )}
      </Show>
    </Button>
  );
};

export { Button, IconButton };
