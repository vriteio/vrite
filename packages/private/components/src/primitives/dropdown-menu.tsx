import clsx from "clsx";
import { Card } from "./card";
import { Dropdown } from "./dropdown";
import { Fragment } from "./fragment";
import {
  ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  Show,
  splitProps
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { Shortcut } from "./shortcut";
import { Menu } from "@ark-ui/solid/menu";
import { Tooltip } from "./tooltip";

interface MenuItem {
  label: string;
  icon?: string | (() => JSX.Element);
  color?: "base" | "danger";
  disabled?: boolean | string;
  shortcut?: string;
  selected?: boolean;
  items?: Array<MenuItem | (() => JSX.Element)> | Array<Array<MenuItem | (() => JSX.Element)>>;
  onClick?(): void;
}
interface DropdownMenuProps<O extends MenuItem> extends Omit<
  ComponentProps<typeof Dropdown>,
  "children"
> {
  items: Array<O | (() => JSX.Element)> | Array<Array<O | (() => JSX.Element)>>;
}

const isMenuItem = (item: unknown): item is MenuItem => {
  return typeof item === "object" && item !== null && typeof (item as MenuItem).label === "string";
};
const isJSXFactory = (item: unknown): item is () => JSX.Element => typeof item === "function";
const flattenWithSeparators = <O extends MenuItem>(
  options:
    | Array<(O & { value: string }) | (() => JSX.Element) | "separator">
    | Array<Array<(O & { value: string }) | (() => JSX.Element) | "separator">>
): Array<"separator" | (O & { value: string }) | (() => JSX.Element)> => {
  return options
    .map((option, index) => {
      if (Array.isArray(option)) {
        if (options.length - 1 === index) {
          return option;
        }

        return [...option, "separator" as const];
      }

      return [option];
    })
    .flat();
};
const addIndices = <O extends MenuItem>(
  options: Array<O | (() => JSX.Element)> | Array<Array<O | (() => JSX.Element)>>,
  prefix = ""
):
  | Array<(O & { value: string }) | (() => JSX.Element) | "separator">
  | Array<Array<(O & { value: string }) | (() => JSX.Element) | "separator">> => {
  let index = -1;

  return options.map((option) => {
    if (Array.isArray(option)) {
      const result: Array<(O & { value: string }) | (() => JSX.Element) | "separator"> = [];

      (option as Array<O | (() => JSX.Element) | Array<O | (() => JSX.Element)>>).forEach(
        (groupedOption) => {
          if (Array.isArray(groupedOption)) {
            if (result.length > 0) result.push("separator");

            (groupedOption as Array<O | (() => JSX.Element)>).forEach((item) => {
              if (!isMenuItem(item)) {
                result.push(item as () => JSX.Element);
                return;
              }

              index += 1;
              result.push({ ...item, value: `${prefix}${index}` });
            });
          } else {
            if (!isMenuItem(groupedOption)) {
              result.push(groupedOption as () => JSX.Element);
              return;
            }

            index += 1;
            result.push({ ...groupedOption, value: `${prefix}${index}` });
          }
        }
      );

      return result;
    }

    if (!isMenuItem(option)) return option as () => JSX.Element;

    index += 1;

    return { ...option, value: `${prefix}${index}` };
  }) as
    | Array<(O & { value: string }) | (() => JSX.Element) | "separator">
    | Array<Array<(O & { value: string }) | (() => JSX.Element) | "separator">>;
};
const MenuItems = <O extends MenuItem>(props: {
  items: Array<"separator" | (O & { value: string }) | (() => JSX.Element)>;
  onClose(): void;
  cardProps?: Partial<ComponentProps<typeof Card>>;
  portal?: boolean;
}) => {
  return (
    <For each={props.items}>
      {(optionOrSeparator) => {
        if (optionOrSeparator === "separator") {
          return <Menu.Separator class="my-0.5 h-px bg-gray-200 dark:bg-gray-700" />;
        }

        if (isJSXFactory(optionOrSeparator)) {
          return optionOrSeparator();
        }

        const option = optionOrSeparator as O & { value: string };

        if (option.items) {
          const subOptions = createMemo(() => {
            return flattenWithSeparators(addIndices(option.items!, `${option.value}-`));
          });

          return (
            <Menu.Root
              positioning={{ placement: "right-start", offset: { mainAxis: 0 } }}
              unmountOnExit
              lazyMount
              loopFocus
            >
              <Menu.TriggerItem
                class={clsx(
                  "w-full flex items-center gap-1 justify-start px-1 py-0.5 rounded-md cursor-pointer outline-none",
                  option.color === "danger"
                    ? "data-[highlighted]:bg-red-600 data-[highlighted]:bg-opacity-10 dark:data-[highlighted]:bg-red-600 dark:data-[highlighted]:bg-opacity-10"
                    : "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800"
                )}
              >
                <Show when={option.icon}>
                  <div
                    class={clsx(
                      "h-4.5 w-4.5",
                      typeof option.icon === "string" && option.icon,
                      option.color === "danger"
                        ? "text-red-500"
                        : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {typeof option.icon === "function" && <Dynamic component={option.icon} />}
                  </div>
                </Show>
                <div class="px-1 flex flex-1 gap-4 items-center">
                  <span
                    title={option.label}
                    class={clsx(
                      "flex-1 text-start text-sm line-clamp-1",
                      option.color === "danger"
                        ? "text-red-500"
                        : "text-gray-700 dark:text-gray-200"
                    )}
                  >
                    {option.label}
                  </span>
                  <div class="h-4 w-4 i-lucide-chevron-right text-gray-400 dark:text-gray-500" />
                </div>
              </Menu.TriggerItem>
              <Dynamic component={props.portal === false ? Fragment : Portal}>
                <Menu.Positioner>
                  <Menu.Content
                    asChild={(contentProps) => (
                      <Card
                        {...contentProps()}
                        {...(props.cardProps || {})}
                        shade
                        class={clsx(
                          `:base-2: z-50 flex flex-col p-1 transform min-w-32 rounded-[0.625rem] pointer-events-auto transition duration-150 shadow-black shadow-opacity-15 min-w-48 bg-white`,
                          props.cardProps?.class
                        )}
                        style={{
                          "transform-origin": "var(--transform-origin)",
                          ...(props.cardProps?.style || {})
                        }}
                      >
                        <div class="overflow-auto scrollbar-sm flex-1 min-w-fit">
                          <div class="flex flex-col w-full gap-0.5">
                            <MenuItems
                              items={subOptions()}
                              onClose={props.onClose}
                              cardProps={props.cardProps}
                              portal={props.portal}
                            />
                          </div>
                        </div>
                      </Card>
                    )}
                  />
                </Menu.Positioner>
              </Dynamic>
            </Menu.Root>
          );
        }

        return (
          <Dynamic
            component={typeof option.disabled === "string" ? Tooltip : Fragment}
            content={typeof option.disabled === "string" ? option.disabled : undefined}
            side="right"
            offset={{ mainAxis: 2 }}
          >
            <Menu.Item
              value={option.value}
              disabled={Boolean(option.disabled)}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onSelect={() => {
                option.onClick?.();
                props.onClose();
              }}
              closeOnSelect
              class={clsx(
                "w-full flex items-center gap-1 justify-start px-1 py-0.5 rounded-md cursor-pointer outline-none",
                option.disabled && "cursor-not-allowed opacity-70",
                option.selected
                  ? "relative group/menu-item"
                  : option.color === "danger"
                    ? "data-[highlighted]:bg-red-600 data-[highlighted]:bg-opacity-10 dark:data-[highlighted]:bg-red-600 dark:data-[highlighted]:bg-opacity-10"
                    : "data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800"
              )}
            >
              <Show when={option.selected}>
                <div class="absolute inset-0 -z-1 rounded-md bg-gradient-to-tr opacity-10 group-data-[highlighted]/menu-item:opacity-100 pointer-events-none" />
              </Show>
              <Show when={option.icon}>
                <div
                  class={clsx(
                    "h-4.5 w-4.5",
                    typeof option.icon === "string" && option.icon,
                    option.selected
                      ? "bg-gradient-to-tr group-data-[highlighted]/menu-item:text-white group-data-[highlighted]/menu-item:from-white group-data-[highlighted]/menu-item:to-white"
                      : option.color === "danger"
                        ? "text-red-500"
                        : "text-gray-500 dark:text-gray-400"
                  )}
                >
                  {typeof option.icon === "function" && option.icon()}
                </div>
              </Show>
              <div class="px-1 flex flex-1 gap-4">
                <span
                  title={option.label}
                  class={clsx(
                    "flex-1 text-start text-sm line-clamp-1",
                    option.selected
                      ? "bg-gradient-to-tr bg-clip-text text-transparent group-data-[highlighted]/menu-item:text-white group-data-[highlighted]/menu-item:from-white group-data-[highlighted]/menu-item:to-white"
                      : option.color === "danger"
                        ? "text-red-500"
                        : "text-gray-700 dark:text-gray-200"
                  )}
                >
                  {option.label}
                </span>
                <Show when={option.shortcut}>
                  <Shortcut class="opacity-50 font-mono text-[90%]" shortcut={option.shortcut!} />
                </Show>
              </div>
            </Menu.Item>
          </Dynamic>
        );
      }}
    </For>
  );
};
const DropdownMenu = <O extends MenuItem>(props: DropdownMenuProps<O>) => {
  const [, dropdownProps] = splitProps(props, ["items"]);
  const [opened, setOpened] = createSignal(props.opened || false);
  const optionsWithIndices = createMemo(() => addIndices(props.items));
  const flattenOptionsAndSeparators = createMemo(() => {
    return flattenWithSeparators(optionsWithIndices());
  });

  createEffect(() => {
    if (typeof props.opened !== "undefined") {
      setOpened(props.opened);
    }
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });

  return (
    <Dropdown
      {...dropdownProps}
      placement={props.placement || "bottom-end"}
      cardProps={{
        ...props.cardProps,
        class: clsx(":base-2: min-w-48 bg-white", props.cardProps?.class)
      }}
      opened={opened()}
      portal={props.portal}
      setOpened={setOpened}
    >
      <div class="flex flex-col w-full gap-0.5">
        <MenuItems
          items={flattenOptionsAndSeparators()}
          onClose={() => setOpened(false)}
          cardProps={props.cardProps}
          portal={props.portal}
        />
      </div>
    </Dropdown>
  );
};

export { DropdownMenu };
export type { MenuItem };
