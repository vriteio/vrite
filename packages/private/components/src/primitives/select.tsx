import { createListCollection, Select as ArkSelect } from "@ark-ui/solid";
import clsx from "clsx";
import { Dropdown } from "./dropdown";
import { Option, OptionsList } from "./options-list";
import { createSignal, createEffect, Component, JSX, Show, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

interface SelectProps<O extends Option> {
  opened?: boolean;
  options: O[];
  value?: string;
  placeholder?: string;
  class?: string;
  children?: Component<O & { selected: boolean }>;
  setOpened?(opened: boolean): void;
  setValue?(value: string): void;
}

const Select = <O extends Option>(props: SelectProps<O>): JSX.Element => {
  const [opened, setOpened] = createSignal(props.opened || false);
  const collection = createMemo(() =>
    createListCollection<O>({
      items: props.options,
      itemToString: (option) => option.label,
      itemToValue: (option) => option.value
    })
  );
  const selectedOption = createMemo(() => {
    return props.options.find((option) => option.value === props.value);
  });

  createEffect(() => {
    setOpened(props.opened || false);
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });

  return (
    <Dropdown
      placement="bottom-end"
      class={props.class}
      trigger={() => {
        return (
          <ArkSelect.Root
            class="w-full"
            collection={collection()}
            value={props.value ? [props.value] : []}
            open={opened()}
            onOpenChange={(details) => setOpened(details.open)}
            onValueChange={(details) => {
              const value = details.value[0];

              if (value) {
                props.setValue?.(value);
              }
            }}
          >
            <ArkSelect.Trigger
              class={clsx(
                ":base: transition-all relative ease-out duration-200 font-medium !ring-0 !outline-none !focus:ring-0 !focus:outline-none cursor-pointer px-1.5 py-1 text-sm rounded-lg border shadow-md flex items-center pl-1 w-full bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-700 shadow-gray-200 dark:shadow-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
              )}
            >
              <ArkSelect.ValueText
                class="flex-1 flex items-start text-start"
                placeholder={props.placeholder || "Select"}
              >
                <Show
                  when={selectedOption()}
                  fallback={
                    <span class="text-gray-400 dark:text-gray-500 mx-1">
                      {props.placeholder || "Select"}
                    </span>
                  }
                >
                  <Show when={props.children} fallback={selectedOption()?.label}>
                    <Dynamic component={props.children} {...selectedOption()!} selected />
                  </Show>
                </Show>
              </ArkSelect.ValueText>
              <ArkSelect.Indicator class="i-lucide:chevrons-up-down text-gray-400 dark:text-gray-500" />
            </ArkSelect.Trigger>
          </ArkSelect.Root>
        );
      }}
      cardProps={{
        class: clsx(
          "!origin-top-center w-full bg-white",
          opened() ? "" : "md:-translate-y-2 md:scale-95"
        )
      }}
      opened={opened()}
      setOpened={setOpened}
    >
      <div class="flex flex-col w-full">
        <OptionsList
          searchable={opened()}
          onSelect={(value) => {
            setOpened(false);
            props.setValue?.(value);
          }}
          value={props.value}
          options={props.options}
        >
          {(option) => {
            return (
              <Button
                class={clsx(
                  "items-center justify-center flex pl-1 w-full group",
                  option.selected &&
                    "bg-gray-100 dark:bg-gray-800 outline-gray-200 dark:outline-gray-700"
                )}
                variant="text"
                size="small"
                hover="none"
              >
                <Show when={props.children} fallback={option.label}>
                  <Dynamic component={props.children} {...option} />
                </Show>
              </Button>
            );
          }}
        </OptionsList>
      </div>
    </Dropdown>
  );
};

export { Select };
