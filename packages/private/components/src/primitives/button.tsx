import { Spinner } from "./spinner";
import clsx from "clsx";
import {
  type Component,
  type ComponentProps,
  type JSX,
  mergeProps,
  Show,
  splitProps,
  createMemo
} from "solid-js";
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
  ":base: transition-all relative ease-out duration-200 font-medium !ring-0 !outline-none !focus:ring-0 !focus:outline-none disabled:opacity-70";
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
    base: ":base: bg-gray-200 border-gray-200",
    contrast: ":base: bg-white border-gray-200 shadow-gray-200",
    danger: ":base: bg-red-500 border-red-600 text-white",
    success: ":base: bg-green-500 border-green-600 text-white",
    primary:
      ":base: bg-gradient-to-tr from-secondary via-primary to-secondary bg-[length:125%_auto] text-white border-tertiary"
  };
  const variants: Record<ButtonVariant, string> = {
    solid: "",
    text: ":base: bg-transparent",
    outlined: ":base: border shadow-md"
  };

  if (!isText) {
    return clsx(variants[variant], solids[color]);
  }

  if (color === "primary")
    return clsx(
      variants.text,
      ":base: text-transparent bg-clip-text bg-gradient-to-tr from-secondary via-primary to-secondary border-tertiary"
    );
  if (color === "danger") {
    return clsx(variants.text, ":base: text-red-500");
  }
  if (color === "success") {
    return clsx(variants.text, ":base: text-green-500");
  }

  return "";
};
const getTextClasses = (text?: ButtonText) => {
  if (!text) return "";

  const map: Record<ButtonText, string> = {
    base: ":base: text-gray-700",
    contrast: ":base: text-gray-900",
    primary: ":base: text-transparent bg-clip-text",
    danger: ":base: text-white",
    success: ":base: text-white",
    softer: ":base: text-gray-500",
    soft: ":base: text-gray-400"
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
    return ":base: @hover:bg-right focus-visible:bg-right @hover:text-current focus-visible:text-current @hover:bg-clip-border focus-visible:bg-clip-border @hover:text-white focus-visible:text-white";
  }
  if (color === "danger" && variant === "text") {
    return ":base: @hover:bg-red-600 focus-visible:bg-red-600 @hover:bg-opacity-10 focus-visible:bg-opacity-10";
  }
  if (color === "success" && variant === "text") {
    return ":base: @hover:text-white focus-visible:text-white @hover:bg-green-600 focus-visible:bg-green-600";
  }
  if (color === "danger") {
    return ":base: @hover:bg-red-600 focus-visible:bg-red-600 @hover:border-red-700 focus-visible:border-red-700";
  }
  if (color === "success") {
    return ":base: @hover:bg-green-600 focus-visible:bg-green-600 @hover:border-green-700 focus-visible:border-green-700";
  }
  if (color === "primary") {
    return ":base: @hover:bg-right focus-visible:bg-right @hover:border-tertiary focus-visible:border-tertiary";
  }
  if (color === "contrast") {
    return ":base: @hover:bg-gray-100 focus-visible:bg-gray-100 @hover:border-gray-200 focus-visible:border-gray-200";
  }
  if (variant === "text") {
    return ":base: @hover:bg-gray-200 focus-visible:bg-gray-200 @hover:border-gray-300 focus-visible:border-gray-300";
  }

  return ":base: @hover:shadow-inner focus-visible:shadow-inner @hover:border-gray-300 focus-visible:border-gray-300";
};
const getUnderlineClasses = (
  color: ButtonColor,
  variant: ButtonVariant,
  text: ButtonText | undefined,
  hover: ButtonProps["hover"]
) => {
  if (hover !== "underline") return "";

  const baseUnderline =
    ":base: after:absolute after:opacity-0 after:transition after:delay-50 after:duration-200 after:ease-out after:origin-left after:scale-x-0 after:w-full after:h-1px after:bottom-px after:left-0 after-rounded-lg after:content-[''] @hover:after:scale-100 focus-visible:after:scale-100 @hover:after:opacity-100 focus-visible:after:opacity-100";

  if (color === "primary" && variant === "text") {
    return clsx(
      baseUnderline,
      ":base: after:bg-gradient-to-tr after:from-secondary after:via-primary after:to-secondary"
    );
  }
  if (variant === "text" && text === "soft") {
    return clsx(baseUnderline, ":base: after:bg-gray-400");
  }

  if (variant === "text" && text === "softer") {
    return clsx(baseUnderline, ":base: after:bg-gray-300");
  }

  if (variant === "text" && (!text || text === "base")) {
    return clsx(baseUnderline, ":base: after:bg-gray-700");
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
    "children",
    "onClick",
    "tabIndex"
  ]);
  const component = createMemo(() => {
    if (props.link) return "a";
    if (props.badge) return "div";
    return "button";
  });
  const tabIndex = createMemo(() => {
    if (component() === "a" && (props.disabled || props.loading)) return -1;
    if (typeof props.tabIndex !== "undefined") return props.tabIndex;
    return undefined;
  });
  const disabled = createMemo(() => Boolean(props.disabled || props.loading));
  const disabledLink = createMemo(() => component() === "a" && disabled());

  return (
    <Dynamic
      component={component()}
      {...passedProps}
      class={clsx(
        baseClasses,
        sizeClasses[props.size],
        getCursorClasses(props.badge),
        getColorClasses(props.color, props.variant),
        getTextClasses(props.text),
        getHoverClasses(props.color, props.variant, props.hover),
        disabledLink() && "opacity-70 pointer-events-none",
        props.class
      )}
      disabled={component() === "button" ? disabled() : undefined}
      aria-disabled={disabledLink() || undefined}
      tabIndex={tabIndex()}
      href={disabledLink() ? undefined : props.link}
      onClick={
        disabledLink()
          ? (event: MouseEvent) => {
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          : props.onClick
      }
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
          <Spinner class="h-full" color={props.color === "primary" ? "primary" : "base"} />
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
          props.text === "primary" && "bg-gradient-to-tr from-secondary via-primary to-secondary",
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
