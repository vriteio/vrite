import { mdiChevronDown } from "@mdi/js";
import { For, JSX, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import clsx from "clsx";
import { scrollIntoView } from "seamless-scroll-polyfill";
import { Dropdown, Button, Icon, Input, Loader } from "#components/primitives";
import { breakpoints, createRef } from "#lib/utils";

interface SearchableSelectProps<O extends object> {
  options: O[];
  selected: O | null;
  placeholder?: string;
  loading?: boolean;
  extractId(option: O): string;
  renderOption(option: O): JSX.Element;
  filterOption(option: O, query: string): boolean;
  selectOption(option: O | null): void;
}

const SearchableSelect = <O extends object>(props: SearchableSelectProps<O>): JSX.Element => {
  const [opened, setOpened] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [mouseSelectEnabled, setMouseSelectEnabled] = createSignal(false);
  const [searchRef, setSearchRef] = createRef<HTMLElement | null>(null);
  const [optionsContainerRef, setOptionsContainerRef] = createRef<HTMLElement | null>(null);
  const selectedOption = createMemo(() => {
    return props.options.find((option) => option === props.selected) || null;
  });
  const filteredOptions = createMemo(() => {
    return props.options.filter((option) => {
      return props.filterOption(option, query());
    });
  });
  const [selectedIndex, setSelectedIndex] = createSignal(-1);
  const upHandler = (): void => {
    setSelectedIndex((selectedIndex() + filteredOptions().length - 1) % filteredOptions().length);
  };
  const downHandler = (): void => {
    setSelectedIndex((selectedIndex() + 1) % filteredOptions().length);
  };
  const enterHandler = (): void => {
    props.selectOption?.(filteredOptions()[selectedIndex()]);
    setOpened(false);
  };
  const scrollOptionIntoView = (smooth?: boolean): void => {
    if (selectedIndex() >= 0) {
      const optionsContainer = optionsContainerRef();
      const option = filteredOptions()[selectedIndex()];

      if (optionsContainer && option) {
        const optionId = props.extractId(option);
        const optionElement = optionsContainer.querySelector(`[data-option-id="${optionId}"]`);

        if (optionElement) {
          optionElement.scrollIntoView({
            behavior: smooth ? "smooth" : "instant",
            block: "nearest"
          });
        }
      }
    }
  };
  const onKeyUp = (event: KeyboardEvent): boolean => {
    setMouseSelectEnabled(false);

    if (event.key === "ArrowUp") {
      upHandler();
      scrollOptionIntoView(selectedIndex() === filteredOptions().length - 1);

      return true;
    }

    if (event.key === "ArrowDown") {
      downHandler();
      scrollOptionIntoView(selectedIndex() === 0);

      return true;
    }

    if (event.key === "Enter") {
      enterHandler();

      return true;
    }

    if (event.key === "Escape") {
      setQuery("");

      return true;
    }

    return false;
  };

  createEffect(
    on(opened, (opened) => {
      if (opened) {
        setTimeout(() => {
          setSelectedIndex(props.selected ? filteredOptions().indexOf(props.selected) : 0);
          searchRef()?.focus();
        }, 100);
      } else {
        setTimeout(() => {
          setSelectedIndex(-1);
          setQuery("");
        }, 100);
      }
    })
  );
  createEffect(on(query, () => setSelectedIndex(0)));

  return (
    <Dropdown
      overlay={!breakpoints.md()}
      opened={opened()}
      setOpened={setOpened}
      autoFocus={false}
      activatorWrapperClass="w-full"
      overflowContainerClass="overflow-hidden flex flex-col"
      class="w-full"
      activatorButton={() => {
        return (
          <Button
            text="soft"
            class="flex m-0 px-1 w-full justify-center items-center"
            color="contrast"
          >
            <Show
              when={selectedOption()}
              keyed
              fallback={
                <>
                  <Show when={props.placeholder}>
                    <span class="px-1 flex-1 text-start">{props.placeholder}</span>
                  </Show>
                  <Icon path={mdiChevronDown} class="h-6 w-6 mr-2" />
                </>
              }
            >
              {(option) => {
                return (
                  <>
                    <div class="flex-1">{props.renderOption(option)}</div>
                    <Icon path={mdiChevronDown} class="h-6 w-6 mr-2" />
                  </>
                );
              }}
            </Show>
          </Button>
        );
      }}
    >
      <div
        class="h-full flex flex-col overflow-hidden"
        onKeyUp={(event: KeyboardEvent) => {
          if (event && filteredOptions().length > 0) {
            onKeyUp(event);
          }
        }}
      >
        <Input
          class="w-full m-0"
          wrapperClass="sticky top-0 z-10 pb-2 bg-gray-50 dark:bg-gray-900"
          color="contrast"
          placeholder="Search"
          ref={setSearchRef}
          value={query()}
          setValue={setQuery}
        />
        <div
          class={clsx(
            "flex flex-1 flex-col gap-1 overflow-x-hidden scrollbar-sm md:pr-2 min-w-72",
            filteredOptions().length > 0 ? "flex" : "hidden"
          )}
          ref={setOptionsContainerRef}
          onPointerMove={() => {
            setMouseSelectEnabled(true);
          }}
        >
          <For each={props.options}>
            {(option) => {
              const index = (): number => filteredOptions().indexOf(option);

              return (
                <Button
                  class={clsx(
                    "m-0 px-1",
                    filteredOptions().includes(option) ? "flex" : "hidden",
                    selectedIndex() === index() && "bg-gray-300 dark:bg-gray-700"
                  )}
                  data-option-id={props.extractId(option)}
                  color={option === props.selected ? "primary" : "contrast"}
                  text={option === props.selected ? "primary" : "soft"}
                  variant={option === props.selected ? "solid" : "text"}
                  onClick={() => {
                    setSelectedIndex(index());
                    enterHandler();
                  }}
                  hover={false}
                  onPointerEnter={() => {
                    if (mouseSelectEnabled()) {
                      setSelectedIndex(index());
                    }
                  }}
                >
                  <div class="flex-1">{props.renderOption(option)}</div>
                </Button>
              );
            }}
          </For>
        </div>
        <span
          class={clsx(
            "text-center text-gray-500 dark:text-gray-400 w-full justify-center items-center",
            filteredOptions().length === 0 ? "flex" : "hidden"
          )}
        >
          <Show when={!props.loading} fallback={<Loader />}>
            No results
          </Show>
        </span>
      </div>
    </Dropdown>
  );
};

export { SearchableSelect };
