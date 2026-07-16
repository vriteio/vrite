import { Spinner } from "./spinner";
import clsx from "clsx";
import { Component, ComponentProps, JSX, mergeProps, Show, splitProps, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

type ButtonColor = "base" | "contrast" | "danger" | "success" | "primary";
type ButtonVariant = "text" | "solid" | "outlined";
type ButtonSize = "xs" | "small" | "medium" | "large";
type ButtonText = "base" | "contrast" | "primary" | "danger" | "success" | "softer" | "soft";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  class?: string;
  badge?: boolean;
  hover?: "underline" | "background" | "none";
  link?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
  text?: ButtonText;
  loading?: boolean;
  target?: string;
}

interface IconButtonProps extends ButtonProps {
  icon?: string;
  iconProps?: ComponentProps<"div">;
  label?: string | Component;
}

const baseClasses =
  ":base: transition-all relative ease-out duration-200 font-medium !ring-0 !outline-none !focus:ring-0 !focus:outline-none disabled:opacity-70 disabled:pointer-events-none";
const sizeClasses: Record<ButtonSize, string> = {
  xs: ":base: px-1 py-0.5 text-xs rounded-lg",
  small: ":base: px-1.5 py-1 text-sm rounded-lg",
  medium: ":base: px-2 py-1 text-base rounded-lg",
  large: ":base: px-4 py-2 text-lg rounded-lg"
};
const iconButtonSizes = {
  xs: { button: ":base: p-1", icon: ":base: w-4.5 h-4.5", label: ":base: pl-1" },
  small: { button: ":base: p-1", icon: ":base: w-5 h-5", label: ":base: pl-1" },
  medium: { button: ":base: p-1", icon: ":base: w-6 h-6", label: ":base: pl-1" },
  large: { button: ":base: p-2", icon: ":base: w-8 h-8", label: ":base: pl-2" }
};
const getCursorClasses = (badge?: boolean) => (!badge ? ":base: cursor-pointer" : "");
const getColorClasses = (color: ButtonColor, variant: ButtonVariant) => {
  const isText = variant === "text";

  const solids: Record<ButtonColor, string> = {
    base: ":base: bg-gray-200 dark:bg-gray-800 border-gray-200 dark:border-gray-800",
    contrast:
      ":base: bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 shadow-gray-200 dark:shadow-gray-950",
    danger: ":base: bg-red-500 dark:bg-red-500 border-red-500 dark:border-red-500 text-white",
    success:
      ":base: bg-green-500 dark:bg-green-500 border-green-500 dark:border-green-500 text-white",
    primary:
      ":base: bg-gradient-to-tr bg-[length:125%_auto] text-white border-primary dark:border-primary"
  };
  const variants: Record<ButtonVariant, string> = {
    solid: "",
    text: ":base: bg-transparent dark:bg-transparent",
    outlined: ":base: border shadow-md"
  };

  if (!isText) {
    return clsx(variants[variant], solids[color]);
  }

  if (color === "primary")
    return clsx(
      variants.text,
      ":base: text-transparent bg-clip-text bg-gradient-to-tr border-primary dark:border-primary"
    );
  if (color === "danger") {
    return clsx(variants.text, ":base: text-red-500 dark:text-red-500");
  }
  if (color === "success") {
    return clsx(variants.text, ":base: text-green-500 dark:text-green-500");
  }

  return "";
};
const getTextClasses = (text?: ButtonText) => {
  if (!text) return "";

  const map: Record<ButtonText, string> = {
    base: ":base: text-gray-700 dark:text-gray-100",
    contrast: ":base: text-gray-900 dark:text-gray-50",
    primary: ":base: text-transparent bg-clip-text dark:text-transparent dark:bg-clip-text",
    danger: ":base: text-white",
    success: ":base: text-white",
    softer: ":base: text-gray-500 dark:text-gray-400",
    soft: ":base: text-gray-400 dark:text-gray-500"
  };

  return map[text];
};
const getHoverClasses = (
  color: ButtonColor,
  variant: ButtonVariant,
  hover: ButtonProps["hover"]
) => {
  if (hover !== "background") {
    return "";
  }
  if (color === "primary" && variant === "text") {
    return ":base: hover:bg-right hover:text-current hover:bg-clip-border hover:text-white dark:hover:text-current dark:hover:bg-clip-border dark:hover:text-white";
  }
  if (color === "danger" && variant === "text") {
    return ":base: hover:bg-red-600 hover:bg-opacity-10 dark:hover:bg-red-600 dark:hover:bg-opacity-10";
  }
  if (color === "success" && variant === "text") {
    return ":base: hover:text-white hover:bg-green-600 dark:hover:bg-green-600 dark:hover:text-white";
  }
  if (color === "danger") {
    return ":base: hover:bg-red-600 dark:hover:bg-red-600 hover:border-red-600 dark:hover:border-red-600";
  }
  if (color === "success") {
    return ":base: hover:bg-green-600 dark:hover:bg-green-600 hover:border-green-600 dark:hover:border-green-600";
  }
  if (color === "primary") {
    return ":base: hover:bg-right hover:border-primary dark:hover:border-primary";
  }
  if (color === "contrast") {
    return ":base: hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700";
  }
  if (variant === "text") {
    return ":base: hover:bg-gray-200 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700";
  }

  return ":base: hover:shadow-inner dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700";
};
const getUnderlineClasses = (
  color: ButtonColor,
  variant: ButtonVariant,
  text: ButtonText | undefined,
  hover: ButtonProps["hover"]
) => {
  if (hover !== "underline") return "";

  const baseUnderline =
    ":base: after:absolute after:opacity-0 after:transition after:delay-50 after:duration-200 after:ease-out after:origin-left after:scale-x-0 after:w-full after:h-1px after:bottom-px after:left-0 after-rounded-lg after:content-[''] hover:after:scale-100 hover:after:opacity-100";

  if (color === "primary" && variant === "text") {
    return clsx(baseUnderline, ":base: after:bg-gradient-to-tr");
  }
  if (variant === "text" && text === "soft") {
    return clsx(baseUnderline, ":base: after:bg-gray-400 dark:after:bg-gray-500");
  }
  return "";
};
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
    return undefined;
  });

  return (
    <Dynamic
      component={component()}
      class={clsx(
        baseClasses,
        sizeClasses[props.size],
        getCursorClasses(props.badge),
        getColorClasses(props.color, props.variant),
        getTextClasses(props.text),
        getHoverClasses(props.color, props.variant, props.hover),
        props.class
      )}
      disabled={props.disabled || props.loading}
      tabIndex={tabIndex()}
      href={props.link}
      {...passedProps}
    >
      <div
        class={clsx(
          "contents",
          props.loading && "invisible",
          getUnderlineClasses(props.color, props.variant, props.text, props.hover)
        )}
      >
        {props.children}
      </div>
      <Show when={props.loading}>
        <div class="flex justify-center items-center absolute w-full h-full p-1.5 top-0 left-0">
          <Spinner class="h-full" />
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
        ":base: flex items-center justify-center",
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
