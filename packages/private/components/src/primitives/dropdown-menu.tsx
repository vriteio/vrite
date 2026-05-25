import clsx from "clsx";
import { IconButton } from "./button";
import { Dropdown } from "./dropdown";
import { Option, OptionsList } from "./options-list";
import { ComponentProps, createEffect, createMemo, createSignal, Show, splitProps } from "solid-js";
import { Shortcut } from "./shortcut";

interface MenuOption extends Omit<Option, "value"> {
  icon?: string;
  color?: "base" | "danger";
  shortcut?: string;
  onClick?(): void;
}
interface DropdownMenuProps<O extends MenuOption>
  extends Omit<ComponentProps<typeof Dropdown>, "children"> {
  options: O[] | Array<O[]>;
}

const DropdownMenu = <O extends MenuOption>(props: DropdownMenuProps<O>) => {
  const [, dropdownProps] = splitProps(props, ["options"]);
  const [opened, setOpened] = createSignal(props.opened || false);
  const optionsWithIndices = createMemo(() => {
    let index = -1;

    return props.options.map((option) => {
      if (Array.isArray(option)) {
        return option.map((groupedOption) => {
          index += 1;

          return { ...groupedOption, value: `${index}` };
        });
      }

      index += 1;

      return { ...option, value: `${index}` };
    }) as Array<O & { value: string }> | Array<Array<O & { value: string }>>;
  });

  createEffect(() => {
    setOpened(props.opened || false);
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
        class: clsx(":base-2: min-w-40 bg-white", props.cardProps?.class)
      }}
      opened={opened()}
      setOpened={setOpened}
    >
      <OptionsList
        searchable
        onSelect={(_, option) => {
          option.onClick?.();
          setOpened(false);
        }}
        separator={() => <hr class="my-1" />}
        options={optionsWithIndices()}
      >
        {(option) => {
          return (
            <IconButton
              icon={option.icon}
              label={() => (
                <div class="px-1 flex flex-1 gap-4">
                  <span class="flex-1 text-start">{option.label}</span>
                  <Show when={option.shortcut}>
                    <Shortcut class="opacity-50 font-mono text-[90%]" shortcut={option.shortcut!} />
                  </Show>
                </div>
              )}
              size="small"
              variant="text"
              color={option.color === "danger" ? "danger" : undefined}
              text={option.color !== "danger" ? "softer" : undefined}
              iconProps={{ class: "h-4.5 w-4.5" }}
              hover="none"
              class={clsx(
                "w-full justify-start px-1 py-0.5 rounded-md",
                option.selected &&
                  option.color === "danger" &&
                  "bg-red-600 bg-opacity-10 dark:bg-red-600 dark:bg-opacity-10",
                option.selected &&
                  option.color !== "danger" &&
                  "bg-gray-100 dark:bg-gray-800 outline-gray-200 dark:outline-gray-700"
              )}
            />
          );
        }}
      </OptionsList>
    </Dropdown>
  );
};

export { DropdownMenu };
export type { MenuOption };
