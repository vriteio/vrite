import { Loader } from "./loader";
import clsx from "clsx";
import { Component, ComponentProps, JSX, mergeProps, Show, splitProps, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

const buttonColors = {
  base: `:base: bg-gray-200 dark:bg-gray-800 outline-gray-200 dark:outline-gray-800`,
  contrast: `:base: bg-white dark:bg-gray-950 outline-gray-200 dark:outline-gray-700 shadow-gray-200 dark:shadow-gray-950`,
  danger: `:base: bg-red-500 dark:bg-red-500 disabled:opacity-70 outline-red-500 dark:outline-red-500 text-white`,
  success: `:base: bg-green-500 dark:bg-green-500 disabled:opacity-70 outline-green-500 dark:outline-green-500 text-white`,
  primary: `:base: bg-gradient-to-tr bg-[length:125%_auto] text-white disabled:opacity-70 outline-primary dark:outline-primary`
};
const textColors = {
  base: `:base-2: text-gray-700 dark:text-gray-100`,
  contrast: `:base-2: text-gray-900 dark:text-gray-50`,
  primary: `:base-2: text-transparent bg-clip-text dark:text-transparent dark:bg-clip-text`,
  danger: `:base-2: text-white`,
  success: `:base-2: text-white`,
  softer: `:base-2: text-gray-500 dark:text-gray-400`,
  soft: `:base-2: text-gray-400 dark:text-gray-500`
};
const buttonVariants = {
  text: `:base-2: bg-transparent dark:bg-transparent`,
  solid: "",
  outlined: ":base-2: outline outline-1 shadow-md focus:outline-1"
};
const buttonSizes = {
  small: `:base: px-1.5 py-1 text-sm rounded-lg`,
  medium: `:base: px-2 py-1 text-base rounded-lg`,
  large: `:base: px-4 py-2 text-lg rounded-lg`
};
const buttonColorsVariants = {
  primaryText: `:base-2: text-transparent bg-clip-text dark:text-transparent dark:bg-clip-text`,
  dangerText: `:base-2: text-red-500 dark:text-red-500`,
  successText: `:base-2: text-green-500 dark:text-green-500`
};
const buttonColorsVariantsTextsHover = {
  ___Background: `:base-2: @hover:shadow-inner dark:@hover:bg-gray-800 @hover:outline-gray-300 dark:@hover:outline-gray-700`,
  _Text_Background: `:base-2: @hover:bg-gray-200 dark:@hover:bg-gray-800 @hover:outline-gray-300 dark:@hover:outline-gray-700`,
  contrast__Background: `:base-2: @hover:bg-gray-100 dark:@hover:bg-gray-800 @hover:outline-gray-200 dark:@hover:outline-gray-700`,
  danger__Background: `:base-2: @hover:bg-red-600 dark:@hover:bg-red-600 @hover:outline-red-600 dark:@hover:outline-red-600`,
  success__Background: `:base-2: @hover:bg-green-600 dark:@hover:bg-green-600 @hover:outline-green-600 dark:@hover:outline-green-600`,
  primary__Background: `:base-2: @hover:bg-right @hover:outline-primary dark:@hover:outline-primary`,
  primaryText_Background: `:base-2: @hover:bg-right @hover:text-current @hover:bg-clip-border @hover:text-white dark:@hover:text-current dark:@hover:bg-clip-border dark:@hover:text-white`,
  dangerText_Background: `:base-2: @hover:bg-red-600 @hover:bg-opacity-10 dark:@hover:bg-red-600 dark:@hover:bg-opacity-10`,
  successText_Background: `:base-2: @hover:text-white @hover:bg-green-600 dark:@hover:bg-green-600 dark:@hover:text-white`,
  primaryText_Underline:
    ":base-2: after:absolute after:opacity-0 after:transition after:delay-50 after:duration-200 after:ease-out after:origin-left after:scale-x-0 after:w-full after:h-1px after:bg-gradient-to-tr after:bottom-px after:left-0 after-rounded-lg after:content-[''] @hover:after:scale-100 @hover:after:opacity-100",

  _TextSoftUnderline:
    ":base-2: after:absolute after:opacity-0 after:transition after:delay-50 after:duration-200 after:ease-out after:origin-left after:scale-x-0 after:w-full after:h-1px after:bg-gray-400 dark:after:bg-gray-500 after:bottom-px after:left-0 after-rounded-lg after:content-[''] @hover:after:scale-100 @hover:after:opacity-100"
};
const iconButtonSizes = {
  small: {
    button: `:base-2: p-1`,
    icon: `:base-2: w-5 h-5`,
    label: `:base-2: pl-1`
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
  hover?: "underline" | "background" | "none";
  link?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  text?: ButtonTextColor;
  loading?: boolean;
  target?: string;
  focusable?: boolean;
}
interface IconButtonProps extends ButtonProps {
  icon?: string;
  iconProps?: ComponentProps<"div">;
  label?: string | Component;
}

const Button: Component<ButtonProps> = (providedProps) => {
  const props = mergeProps(
    {
      color: "base",
      variant: "solid",
      size: "medium",
      hover: "background"
    } as const,
    providedProps
  );
  const [, passedProps] = splitProps(props, [
    "class",
    "hover",
    "loading",
    "focusable",
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
  const tabIndex = createMemo(() => {
    if (typeof props.tabIndex !== "undefined") return props.tabIndex;
    if (props.focusable) return -1;

    return undefined;
  });

  return (
    <Dynamic
      component={component()}
      class={clsx(
        `:base: transition-all relative ease-out duration-200 !ring-0 !focus:ring-0 font-medium`,
        !props.focusable && ":base: outline-0 focus:outline-0",
        props.focusable && ":base: outline-0 !focus:outline-2 !focus:outline !outline-offset-2",
        !props.badge && ":base: cursor-pointer",
        buttonVariants[props.variant],
        buttonSizes[props.size],
        buttonColors[props.color],
        props.text && textColors[props.text],
        {
          [buttonColorsVariants.primaryText]: props.color === "primary" && props.variant === "text",
          [buttonColorsVariants.dangerText]: props.color === "danger" && props.variant === "text",
          [buttonColorsVariants.successText]: props.color === "success" && props.variant === "text",
          ...(() => {
            if (props.hover !== "background") return {};

            const classNameMatchers = [
              [
                buttonColorsVariantsTextsHover.primaryText_Background,
                props.color === "primary" && props.variant === "text"
              ],
              [
                buttonColorsVariantsTextsHover.dangerText_Background,
                props.color === "danger" && props.variant === "text"
              ],
              [
                buttonColorsVariantsTextsHover.successText_Background,
                props.color === "success" && props.variant === "text"
              ],
              [buttonColorsVariantsTextsHover.danger__Background, props.color === "danger"],
              [buttonColorsVariantsTextsHover.success__Background, props.color === "success"],
              [buttonColorsVariantsTextsHover.primary__Background, props.color === "primary"],
              [buttonColorsVariantsTextsHover.contrast__Background, props.color === "contrast"],
              [buttonColorsVariantsTextsHover._Text_Background, props.variant === "text"],
              [buttonColorsVariantsTextsHover.___Background, true]
            ] as const;

            return {
              [classNameMatchers.find(([, condition]) => condition)![0] || ""]: true
            };
          })()
        },
        props.class
      )}
      disabled={props.disabled || props.loading}
      tabIndex={tabIndex()}
      href={props.link}
      {...passedProps}
    >
      <div
        class={clsx("contents", props.loading && "invisible", {
          ...(() => {
            if (props.hover !== "underline") return {};

            const classNameMatchers = [
              [
                buttonColorsVariantsTextsHover.primaryText_Underline,
                props.color === "primary" && props.variant === "text"
              ],
              [
                buttonColorsVariantsTextsHover._TextSoftUnderline,
                props.variant === "text" && props.text === "soft"
              ]
            ] as const;

            return {
              [classNameMatchers.find(([, condition]) => condition)![0] || ""]: true
            };
          })()
        })}
      >
        {props.children}
      </div>
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
      variant: "solid",
      size: "medium"
    } as const,
    providedProps
  );
  const [, passedProps] = splitProps(props, ["icon", "iconProps", "label"]);

  return (
    <Button
      {...passedProps}
      class={clsx(
        `:base: flex items-center justify-center`,
        iconButtonSizes[props.size].button,
        props.class
      )}
    >
      <div
        {...props.iconProps}
        class={clsx(
          iconButtonSizes[props.size].icon,
          props.text === "primary" && "bg-gradient-to-tr",
          props.icon,
          props.iconProps?.class
        )}
      >
        {props.children}
      </div>
      <Show when={typeof props.label === "function"}>
        <Dynamic component={props.label} />
      </Show>
      <Show when={typeof props.label === "string"}>
        <span class={iconButtonSizes[props.size].label}>{`${props.label}`}</span>
      </Show>
    </Button>
  );
};

export { Button, IconButton };
