import { Menu } from "@ark-ui/solid/menu";
import clsx from "clsx";
import { createEffect, createSignal, For, Match, on, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Shortcut } from "../shortcut";
import { Spinner } from "../spinner";
import {
  addIndices,
  type FlattenedMenuItem,
  flattenWithSeparators,
  isJSXFactory,
  type MenuItem
} from "../dropdown-menu-items";

interface MenuPage<O extends MenuItem> {
  title?: string;
  items: Array<FlattenedMenuItem<O>>;
}

interface MobileMenuOptionProps<O extends MenuItem> {
  option: O & { value: string };
  onClose(): void;
  onNavigate(option: O & { value: string }): void;
}

const MobileMenuOption = <O extends MenuItem>(props: MobileMenuOptionProps<O>) => {
  const [loading, setLoading] = createSignal(false);
  const itemClass = () => {
    return clsx(
      "relative w-full flex items-center gap-1 justify-start px-1 py-0.5 rounded-md cursor-pointer outline-none",
      (props.option.disabled || loading()) && "cursor-not-allowed opacity-70",
      props.option.selected
        ? "group/menu-item"
        : props.option.color === "danger"
          ? "data-[highlighted]:bg-red-600 data-[highlighted]:bg-opacity-10"
          : "data-[highlighted]:bg-gray-100"
    );
  };
  const handleSelect = () => {
    const result = props.option.onClick?.();

    if (result instanceof Promise) {
      setLoading(true);
      void result.finally(() => {
        setLoading(false);
        props.onClose();
      });
    } else {
      props.onClose();
    }
  };

  return (
    <Switch>
      <Match when={Boolean(props.option.items)}>
        <button
          type="button"
          class={itemClass()}
          disabled={Boolean(props.option.disabled)}
          onClick={() => props.onNavigate(props.option)}
        >
          <Show when={props.option.icon}>
            <div
              class={clsx(
                "h-4.5 w-4.5",
                typeof props.option.icon === "string" && props.option.icon,
                props.option.color === "danger" ? "text-red-500" : "text-gray-500"
              )}
            >
              {typeof props.option.icon === "function" && <Dynamic component={props.option.icon} />}
            </div>
          </Show>
          <div class="px-1 flex flex-1 gap-4 items-center">
            <span
              title={props.option.label}
              class={clsx(
                "flex-1 text-start text-sm line-clamp-1",
                props.option.color === "danger" ? "text-red-500" : "text-gray-700"
              )}
            >
              {props.option.label}
            </span>
            <div class="h-4 w-4 i-lucide-chevron-right text-gray-400" />
          </div>
        </button>
      </Match>
      <Match when={true}>
        <Menu.Item
          value={props.option.value}
          disabled={Boolean(props.option.disabled) || loading()}
          closeOnSelect={false}
          class={itemClass()}
          onSelect={handleSelect}
        >
          <div class={clsx("contents", loading() && "invisible")}>
            <Show when={props.option.selected}>
              <div class="absolute inset-0 -z-1 rounded-md bg-gradient-to-tr opacity-10 group-data-[highlighted]/menu-item:opacity-100 pointer-events-none" />
            </Show>
            <Show when={props.option.icon}>
              <div
                class={clsx(
                  "h-4.5 w-4.5",
                  typeof props.option.icon === "string" && props.option.icon,
                  props.option.selected
                    ? "bg-gradient-to-tr group-data-[highlighted]/menu-item:text-white group-data-[highlighted]/menu-item:from-white group-data-[highlighted]/menu-item:to-white"
                    : props.option.color === "danger"
                      ? "text-red-500"
                      : "text-gray-500"
                )}
              >
                {typeof props.option.icon === "function" && props.option.icon()}
              </div>
            </Show>
            <div class="px-1 flex flex-1 gap-4">
              <span
                title={props.option.label}
                class={clsx(
                  "flex-1 text-start text-sm line-clamp-1",
                  props.option.selected
                    ? "bg-gradient-to-tr bg-clip-text text-transparent group-data-[highlighted]/menu-item:text-white group-data-[highlighted]/menu-item:from-white group-data-[highlighted]/menu-item:to-white"
                    : props.option.color === "danger"
                      ? "text-red-500"
                      : "text-gray-700"
                )}
              >
                {props.option.label}
              </span>
              <Show when={props.option.shortcut}>
                <Shortcut
                  class="opacity-50 font-mono text-[90%]"
                  shortcut={props.option.shortcut!}
                />
              </Show>
            </div>
          </div>
          <Show when={loading()}>
            <div class="absolute inset-0 flex items-center justify-center p-1.5">
              <Spinner class="h-full" />
            </div>
          </Show>
        </Menu.Item>
      </Match>
    </Switch>
  );
};

const MobileMenuItems = <O extends MenuItem>(props: {
  items: Array<FlattenedMenuItem<O>>;
  opened: boolean;
  onClose(): void;
}) => {
  const rootPage = (): MenuPage<O> => ({ items: props.items });
  const [pages, setPages] = createSignal<Array<MenuPage<O>>>([rootPage()]);
  const currentPage = () => pages()[pages().length - 1] || rootPage();

  createEffect(
    on(
      () => props.opened,
      (opened, wasOpened) => {
        if (opened && !wasOpened) setPages([rootPage()]);
      }
    )
  );

  return (
    <div class="flex min-w-0 flex-col">
      <Show when={pages().length > 1}>
        <div class="mb-0.5 flex items-center border-b border-gray-200 pb-0.5">
          <button
            type="button"
            class="flex items-center rounded-md p-0.5 text-gray-500 @hover:bg-gray-100"
            aria-label="Back"
            onClick={() => setPages((current) => current.slice(0, -1))}
          >
            <div class="i-lucide:chevron-left h-4.5 w-4.5" />
          </button>
          <span class="min-w-0 flex-1 truncate pr-5 text-center text-sm font-medium text-gray-900">
            {currentPage().title}
          </span>
        </div>
      </Show>
      <div class="flex flex-col gap-0.5 overflow-y-auto overscroll-contain scrollbar-sm">
        <For each={currentPage().items}>
          {(optionOrSeparator) => {
            const jsxFactory = isJSXFactory(optionOrSeparator) ? optionOrSeparator : null;
            const option =
              optionOrSeparator !== "separator" && !jsxFactory
                ? (optionOrSeparator as O & { value: string })
                : null;

            return (
              <Switch>
                <Match when={optionOrSeparator === "separator"}>
                  <Menu.Separator class="my-0.5 h-px bg-gray-200" />
                </Match>
                <Match when={jsxFactory} keyed>
                  {(Factory) => <Dynamic component={Factory} />}
                </Match>
                <Match when={option} keyed>
                  {(menuOption) => (
                    <MobileMenuOption
                      option={menuOption}
                      onClose={props.onClose}
                      onNavigate={(nestedOption) => {
                        const items = flattenWithSeparators(
                          addIndices(nestedOption.items!, `${nestedOption.value}-`)
                        ) as Array<FlattenedMenuItem<O>>;

                        setPages((current) => [...current, { title: nestedOption.label, items }]);
                      }}
                    />
                  )}
                </Match>
              </Switch>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export { MobileMenuItems };
