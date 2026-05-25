import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  For,
  JSX,
  Match,
  onCleanup,
  Switch
} from "solid-js";
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
  const [selected, setSelected] = createSignal(props.value);
  const [query, setQuery] = createSignal("");
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

  createEffect(() => {
    let timeoutHandle = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.length > 1) return;

      const newQuery = query() + event.key;
      const match = flattenOptions().find((option) => {
        const formattedQuery = newQuery.toLowerCase().trim();
        const formattedLabel = option.label.toLowerCase().trim();
        return (
          formattedLabel.startsWith(formattedQuery) ||
          formattedLabel.split(" ").some((word) => word.startsWith(formattedQuery))
        );
      })?.value;

      setQuery(match ? newQuery : event.key);
      setSelected((selected) => match || selected);
      timeoutHandle = window.setTimeout(() => {
        setQuery("");
      }, 2000);
    };

    if (props.searchable) {
      document.body.addEventListener("keydown", handleKeyDown);
    }

    onCleanup(() => {
      document.body.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutHandle);
      setQuery("");
    });
  });
  createEffect(() => {
    const handleArrowKeys = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        const index = flattenOptions().findIndex((option) => option.value === selected());
        setSelected(flattenOptions()[(index + 1) % flattenOptions().length].value);
      } else if (event.key === "ArrowUp") {
        const index = flattenOptions().findIndex((option) => option.value === selected());
        setSelected(
          flattenOptions()[(index - 1 + flattenOptions().length) % flattenOptions().length].value
        );
      }
      if (event.key === "Enter" && selected()) {
        props.onSelect?.(
          selected()!,
          flattenOptions().find((option) => option.value === selected()) as O
        );
      }

      event.preventDefault();
      event.stopPropagation();
    };

    document.body.addEventListener("keydown", handleArrowKeys);

    onCleanup(() => {
      document.body.removeEventListener("keydown", handleArrowKeys);
    });
  });

  return (
    <div class="flex flex-col w-full">
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
                    <div
                      class="contents"
                      onPointerEnter={() => setSelected(option.value)}
                      onClick={(event) => {
                        props.onSelect?.(option.value, option);
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <Dynamic
                        component={props.children}
                        {...option}
                        selected={option.value === selected()}
                      />
                    </div>
                  );
                }}
              </Match>
            </Switch>
          );
        }}
      </For>
    </div>
  );
};

export { OptionsList };
export type { Option };
