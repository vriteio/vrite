import { createListCollection, Select as ArkSelect } from "@ark-ui/solid/select";
import clsx from "clsx";
import { createMemo, For, type JSX, Show } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { Button } from "./button";
import { Card } from "./card";
import { Fragment } from "./fragment";

interface Option {
  label: string;
  value: string;
}

interface SelectProps<O extends Option> {
  disabled?: boolean;
  opened?: boolean;
  options: O[];
  portal?: boolean;
  positioningStrategy?: "absolute" | "fixed";
  value?: string;
  placeholder?: string;
  title?: string;
  class?: string;
  triggerClass?: string;
  setOpened?(opened: boolean): void;
  setValue?(value: string): void;
}

const Select = <O extends Option>(props: SelectProps<O>): JSX.Element => {
  const collection = createMemo(() => createListCollection({ items: props.options }));

  return (
    <ArkSelect.Root
      class={clsx(props.portal === false && "relative", props.class)}
      collection={collection()}
      disabled={props.disabled}
      loopFocus
      open={props.opened}
      positioning={{
        placement: "bottom-end",
        offset: { mainAxis: 4 },
        strategy: props.positioningStrategy
      }}
      value={props.value ? [props.value] : []}
      onOpenChange={(details) => props.setOpened?.(details.open)}
      onValueChange={(details) => props.setValue?.(details.value[0] || "")}
      lazyMount
      unmountOnExit
    >
      <ArkSelect.Control>
        <ArkSelect.Trigger
          asChild={(triggerProps) => (
            <Button
              {...triggerProps()}
              class={clsx("group/select-trigger flex w-full items-center px-2", props.triggerClass)}
              variant="outlined"
              color="contrast"
              size="small"
              disabled={props.disabled}
            >
              <ArkSelect.ValueText
                class="min-w-0 flex-1 truncate text-start group-data-[placeholder-shown]/select-trigger:text-gray-400"
                placeholder={props.placeholder || "Select"}
              />
              <ArkSelect.Indicator class="i-lucide:chevrons-up-down ml-auto shrink-0 text-gray-400" />
            </Button>
          )}
        />
      </ArkSelect.Control>
      <Dynamic component={props.portal === false ? Fragment : Portal}>
        <ArkSelect.Positioner class="z-50 select-none">
          <ArkSelect.Content
            asChild={(contentProps) => (
              <Card
                {...contentProps()}
                shade
                class={clsx(
                  ":base-2: z-50 flex w-[var(--reference-width)] min-w-32 transform flex-col select-none rounded-[0.625rem] bg-white p-1 pointer-events-auto shadow-black shadow-opacity-15 transition duration-200",
                  "data-[state=open]:visible data-[state=open]:translate-y-0 data-[state=open]:opacity-100",
                  "data-[state=closed]:invisible data-[state=closed]:opacity-0 data-[state=closed]:!shadow-none"
                )}
                style={{ "transform-origin": "var(--transform-origin)" }}
              >
                <div class="min-w-fit flex-1 overflow-auto scrollbar-sm">
                  <div class="flex w-full flex-col gap-0.5">
                    <For each={props.options}>
                      {(option) => {
                        const selected = () => props.value === option.value;

                        return (
                          <ArkSelect.Item
                            item={option}
                            class={clsx(
                              "relative flex w-full cursor-pointer items-center justify-start gap-1 rounded-md px-1 py-0.5 outline-none",
                              selected() ? "group/select-item" : "data-[highlighted]:bg-gray-100"
                            )}
                          >
                            <Show when={selected()}>
                              <div class="absolute inset-0 -z-1 rounded-md bg-gradient-to-tr opacity-10 group-data-[highlighted]/select-item:opacity-100 pointer-events-none" />
                            </Show>
                            <ArkSelect.ItemText
                              title={option.label}
                              class={clsx(
                                "flex-1 px-1 text-start text-sm line-clamp-1",
                                selected()
                                  ? "bg-gradient-to-tr bg-clip-text text-transparent group-data-[highlighted]/select-item:text-white group-data-[highlighted]/select-item:from-white group-data-[highlighted]/select-item:to-white"
                                  : "text-gray-700"
                              )}
                            >
                              {option.label}
                            </ArkSelect.ItemText>
                          </ArkSelect.Item>
                        );
                      }}
                    </For>
                  </div>
                </div>
              </Card>
            )}
          />
        </ArkSelect.Positioner>
      </Dynamic>
    </ArkSelect.Root>
  );
};

export { Select };
export type { Option };
