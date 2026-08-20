import { Menu } from "@ark-ui/solid/menu";
import clsx from "clsx";
import { type Component, createEffect, createSignal, For, Match, on, Show, Switch } from "solid-js";
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

interface MobileMenuNavigation {
  backAvailable: boolean;
  destinationTitle?: string;
  onBack(): void;
}

interface MobileMenuOptionProps<O extends MenuItem> {
  option: O & { value: string };
  onClose(): void;
  onNavigate(option: O & { value: string }): void;
}

interface MobileMenuIconProps {
  option: MenuItem;
}

interface MobileMenuItemsProps<O extends MenuItem> {
  items: Array<FlattenedMenuItem<O>>;
  opened: boolean;
  title?: string;
  onClose(): void;
  onNavigationChange(navigation: MobileMenuNavigation): void;
}

const MobileMenuIcon: Component<MobileMenuIconProps> = (props) => (
  <Show when={props.option.icon}>
    <div class="relative flex h-6 w-6 shrink-0 items-center justify-center">
      <div
        class={clsx(
          "h-5 w-5",
          typeof props.option.icon === "string" && props.option.icon,
          props.option.selected
            ? "bg-gradient-to-tr group-data-[highlighted]/menu-item:text-white group-data-[highlighted]/menu-item:from-white group-data-[highlighted]/menu-item:to-white"
            : props.option.color === "danger"
              ? "text-red-500"
              : "text-gray-500"
        )}
      >
        {typeof props.option.icon === "function" && <Dynamic component={props.option.icon} />}
      </div>
    </div>
  </Show>
);

const MobileMenuOption = <O extends MenuItem>(props: MobileMenuOptionProps<O>) => {
  const [loading, setLoading] = createSignal(false);
  const itemClass = () => {
    return clsx(
      "relative flex min-h-7 w-full cursor-pointer items-center justify-start gap-1 rounded-md px-0.5 outline-none",
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

        if (props.option.closeOnSelect !== false) props.onClose();
      });
    } else if (props.option.closeOnSelect !== false) {
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
          <MobileMenuIcon option={props.option} />
          <div class="flex flex-1 items-center gap-4">
            <span
              title={props.option.label}
              class={clsx(
                "flex-1 text-start text-[16px] font-medium line-clamp-1",
                props.option.color === "danger" ? "text-red-500" : "text-gray-700"
              )}
            >
              {props.option.label}
            </span>
            <div class="h-5 w-5 i-lucide-chevron-right text-gray-400" />
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
            <MobileMenuIcon option={props.option} />
            <div class="flex flex-1 gap-4">
              <span
                title={props.option.label}
                class={clsx(
                  "flex-1 text-start text-[16px] font-medium line-clamp-1",
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

const MobileMenuItems = <O extends MenuItem>(props: MobileMenuItemsProps<O>) => {
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
  createEffect(() => {
    const currentPages = pages();
    const destinationPage = currentPages[currentPages.length - 2];

    props.onNavigationChange({
      backAvailable: currentPages.length > 1,
      destinationTitle: destinationPage?.title || props.title,
      onBack: () => setPages((current) => current.slice(0, -1))
    });
  });

  return (
    <div class="flex w-full min-w-0 max-w-full flex-col gap-0.5 overflow-y-auto overscroll-contain scrollbar-sm">
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
  );
};

export { MobileMenuItems };
export type { MobileMenuNavigation };
