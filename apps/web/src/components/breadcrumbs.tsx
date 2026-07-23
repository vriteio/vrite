import { Tooltip } from "@andesine/components";
import { Component, For, JSX, Show } from "solid-js";

interface BreadcrumbItem {
  label: JSX.Element;
  onClick?(): void;
}

interface BreadcrumbsProps {
  icon: JSX.Element;
  iconTooltip: string;
  items: readonly BreadcrumbItem[];
  children?: JSX.Element;
}

const Breadcrumbs: Component<BreadcrumbsProps> = (props) => {
  return (
    <div class="flex h-11 w-full items-center justify-center gap-2 p-2 pl-4">
      <Show when={props.items.length > 0}>
        <span class="inline-flex items-center justify-center text-base font-medium leading-[1]">
          <Tooltip content={props.iconTooltip} fixed>
            {props.icon}
          </Tooltip>
          <For each={props.items}>
            {(item) => (
              <>
                <span class="i-lucide:chevron-right h-4 w-4 text-gray-400" />
                <Show when={item.onClick} fallback={<span>{item.label}</span>}>
                  {(onClick) => (
                    <button type="button" class="hover:text-primary-500" onClick={onClick()}>
                      {item.label}
                    </button>
                  )}
                </Show>
              </>
            )}
          </For>
        </span>
      </Show>
      <div class="flex-1" />
      {props.children}
    </div>
  );
};

export { Breadcrumbs };
export type { BreadcrumbItem };
