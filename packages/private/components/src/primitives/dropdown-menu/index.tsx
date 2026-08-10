import clsx from "clsx";
import { Card } from "../card";
import { Dropdown } from "../dropdown";
import { Fragment } from "../fragment";
import {
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  Show,
  splitProps
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { Shortcut } from "../shortcut";
import { Spinner } from "../spinner";
import { Menu } from "@ark-ui/solid/menu";
import { Tooltip } from "../tooltip";
import { createMediaQuery } from "@solid-primitives/media";
import { MobileMenuItems } from "./dropdown-menu-mobile";
import {
  addIndices,
  flattenWithSeparators,
  isJSXFactory,
  type MenuItem
} from "../dropdown-menu-items";

interface DropdownMenuProps<O extends MenuItem> extends Omit<
  ComponentProps<typeof Dropdown>,
  "children"
> {
  items: Array<O | (() => JSX.Element)> | Array<Array<O | (() => JSX.Element)>>;
}

const MenuItems = <O extends MenuItem>(props: {
  items: Array<"separator" | (O & { value: string }) | (() => JSX.Element)>;
  onClose(): void;
  cardProps?: Partial<ComponentProps<typeof Card>>;
  portal?: boolean;
}) => (
  <For each={props.items}>
    {(optionOrSeparator) => {
      if (optionOrSeparator === "separator") {
        return <Menu.Separator class="my-0.5 h-px bg-gray-200" />;
      }

      if (isJSXFactory(optionOrSeparator)) {
        return optionOrSeparator();
      }

      const option = optionOrSeparator as O & { value: string };
      const [loading, setLoading] = createSignal(false);

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
                  ? "data-[highlighted]:bg-red-600 data-[highlighted]:bg-opacity-10"
                  : "data-[highlighted]:bg-gray-100"
              )}
            >
              <Show when={option.icon}>
                <div
                  class={clsx(
                    "h-4.5 w-4.5",
                    typeof option.icon === "string" && option.icon,
                    option.color === "danger" ? "text-red-500" : "text-gray-500"
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
                    option.color === "danger" ? "text-red-500" : "text-gray-700"
                  )}
                >
                  {option.label}
                </span>
                <div class="h-4 w-4 i-lucide-chevron-right text-gray-400" />
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
            disabled={Boolean(option.disabled) || loading()}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onSelect={() => {
              const result = option.onClick?.();

              if (result instanceof Promise) {
                setLoading(true);
                void result.finally(() => {
                  setLoading(false);
                  props.onClose();
                });
              } else {
                props.onClose();
              }
            }}
            closeOnSelect={!option.items && !loading()}
            class={clsx(
              "relative w-full flex items-center gap-1 justify-start px-1 py-0.5 rounded-md cursor-pointer outline-none",
              (option.disabled || loading()) && "cursor-not-allowed opacity-70",
              option.selected
                ? "relative group/menu-item"
                : option.color === "danger"
                  ? "data-[highlighted]:bg-red-600 data-[highlighted]:bg-opacity-10"
                  : "data-[highlighted]:bg-gray-100"
            )}
          >
            <div class={clsx("contents", loading() && "invisible")}>
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
                        : "text-gray-500"
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
                        : "text-gray-700"
                  )}
                >
                  {option.label}
                </span>
                <Show when={option.shortcut}>
                  <Shortcut class="opacity-50 font-mono text-[90%]" shortcut={option.shortcut!} />
                </Show>
              </div>
            </div>
            <Show when={loading()}>
              <div class="absolute inset-0 flex items-center justify-center p-1.5">
                <Spinner class="h-full" />
              </div>
            </Show>
          </Menu.Item>
        </Dynamic>
      );
    }}
  </For>
);
const DropdownMenu = <O extends MenuItem>(props: DropdownMenuProps<O>) => {
  const md = createMediaQuery("(min-width: 768px)");
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
      <Show
        when={!md()}
        fallback={
          <div class="flex flex-col w-full gap-0.5">
            <MenuItems
              items={flattenOptionsAndSeparators()}
              onClose={() => setOpened(false)}
              cardProps={props.cardProps}
              portal={props.portal}
            />
          </div>
        }
      >
        <MobileMenuItems
          items={flattenOptionsAndSeparators()}
          opened={opened()}
          onClose={() => setOpened(false)}
        />
      </Show>
    </Dropdown>
  );
};

export { DropdownMenu };
export type { MenuItem };
