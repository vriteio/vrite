import clsx from "clsx";
import { Button } from "./button";
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
      activatorButton={() => {
        return (
          <Button
            class="flex items-center pl-1 w-full"
            size="small"
            color="contrast"
            variant="outlined"
          >
            <div class="flex-1 flex items-start">
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
            </div>
            <div class="i-lucide:chevrons-up-down text-gray-400 dark:text-gray-500" />
          </Button>
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
