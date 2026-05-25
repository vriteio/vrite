import { createListCollection, Listbox } from "@ark-ui/solid";
import { Component, createMemo, For, JSX, Match, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";

interface Option {
  label: string;
  value: string;
}

interface OptionsListProps<O extends Option> {
  value?: string;
  options: Array<O> | Array<O[]>;
  class?: string;
  searchable?: boolean;
  onSelect?(value: string, option: O): void;
  children?: Component<O & { selected: boolean }>;
  separator?: Component;
}

const OptionsList = <O extends Option>(props: OptionsListProps<O>): JSX.Element => {
  const flattenOptionsAndSeparators = createMemo<Array<string | O>>(() => {
    return props.options
      .map((option, index) => {
        if (Array.isArray(option)) {
          if (props.options.length - 1 === index) {
            return option;
          }

          return [...option, "separator"];
        }

        return [option];
      })
      .flat();
  });
  const flattenOptions = createMemo(() => {
    return flattenOptionsAndSeparators().filter((option) => option !== "separator") as O[];
  });

  const collection = createMemo(() =>
    createListCollection<O>({
      items: flattenOptions(),
      itemToString: (option) => option.label,
      itemToValue: (option) => option.value
    })
  );
  const selectedValue = createMemo(() => (props.value ? [props.value] : []));

  return (
    <Listbox.Root
      class="flex flex-col w-full"
      collection={collection()}
      selectionMode="single"
      value={selectedValue()}
      typeahead={props.searchable}
      onValueChange={(details) => {
        const value = details.value[0];

        if (!value) return;

        const option = flattenOptions().find((item) => item.value === value);

        if (option) {
          props.onSelect?.(value, option);
        }
      }}
    >
      <Listbox.Content class="flex flex-col w-full">
        <For each={flattenOptionsAndSeparators()}>
          {(optionOrSeparator) => {
            return (
              <Switch>
                <Match when={optionOrSeparator === "separator" && props.separator}>
                  <Dynamic component={props.separator} />
                </Match>
                <Match when={optionOrSeparator !== "separator"}>
                  {(_) => {
                    const option = optionOrSeparator as O;

                    return (
                      <Listbox.Item item={option} class="contents">
                        <Dynamic
                          component={props.children}
                          {...option}
                          selected={option.value === props.value}
                        />
                      </Listbox.Item>
                    );
                  }}
                </Match>
              </Switch>
            );
          }}
        </For>
      </Listbox.Content>
    </Listbox.Root>
  );
};

export { OptionsList };
export type { Option };
