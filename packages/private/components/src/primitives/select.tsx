import { createMemo, type JSX, Show } from "solid-js";
import { Button } from "./button";
import { DropdownMenu } from "./dropdown-menu";

interface Option {
  label: string;
  value: string;
}

interface SelectProps<O extends Option> {
  disabled?: boolean;
  opened?: boolean;
  options: O[];
  value?: string;
  placeholder?: string;
  title?: string;
  class?: string;
  setOpened?(opened: boolean): void;
  setValue?(value: string): void;
}

const Select = <O extends Option>(props: SelectProps<O>): JSX.Element => {
  const selectedOption = createMemo(() => {
    return props.options.find((option) => option.value === props.value);
  });
  const items = createMemo(() => {
    return props.options.map((option) => ({
      ...option,
      source: option,
      selected: option.value === props.value,
      onClick: () => props.setValue?.(option.value)
    }));
  });

  return (
    <DropdownMenu
      title={props.title || props.placeholder || "Select"}
      placement="bottom-end"
      class={props.class}
      disabled={props.disabled}
      opened={props.opened}
      setOpened={props.setOpened}
      items={items()}
      cardProps={{ class: "w-[var(--reference-width)]" }}
      offset={{ mainAxis: 4 }}
      trigger={() => (
        <Button
          class="flex w-full items-center px-2"
          variant="outlined"
          color="contrast"
          size="small"
          disabled={props.disabled}
        >
          <span class="flex flex-1 items-start text-start">
            <Show
              when={selectedOption()}
              fallback={<span class="mx-1 text-gray-400">{props.placeholder || "Select"}</span>}
            >
              {selectedOption()?.label}
            </Show>
          </span>
          <span class="i-lucide:chevrons-up-down text-gray-400" />
        </Button>
      )}
    />
  );
};

export { Select };
export type { Option };
