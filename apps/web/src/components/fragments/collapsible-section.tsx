import { Component, JSX, Show, createSignal } from "solid-js";
import { mdiChevronDown } from "@mdi/js";
import clsx from "clsx";
import { Card, Heading, IconButton } from "#components/primitives";

interface CollapsibleSectionProps {
  icon: JSX.Element;
  label: string;
  children?: JSX.Element;
  action?: JSX.Element;
  gradient?: boolean;
  defaultOpened?: boolean;
  mode?: "hide" | "remove";
}

const CollapsibleSection: Component<CollapsibleSectionProps> = (props) => {
  const [opened, setOpened] = createSignal(
    typeof props.defaultOpened === "boolean" ? props.defaultOpened : true
  );

  return (
    <div class="w-full flex flex-col m-0 p-0 items-start">
      <div class="flex w-full gap-2 items-center">
        <div class="flex-1 flex">
          <button
            class="group flex flex-1 justify-center items-center"
            onClick={() => {
              setOpened(!opened());
            }}
          >
            <div class="opacity-90 w-full flex justify-center items-center p-0 m-0 pr-0.5 relative rounded-lg md:group-hover:bg-gray-200 md:dark:group-hover:bg-gray-700">
              <Show when={typeof props.icon === "string"} fallback={props.icon}>
                <IconButton
                  badge
                  path={props.icon as string}
                  text="base"
                  color={props.gradient ? "primary" : "base"}
                  class="m-0"
                  variant="text"
                  hover={false}
                />
              </Show>
              <Heading
                level={3}
                class={clsx(
                  "flex-1 text-start whitespace-nowrap mr-3",
                  props.gradient && "text-transparent bg-gradient-to-tr bg-clip-text"
                )}
              >
                {props.label}
              </Heading>
              <IconButton
                badge
                path={mdiChevronDown}
                text="soft"
                class={clsx("m-0 h-7 w-7 p-0.5", !opened() && "rotate-90")}
                variant="text"
              />
            </div>
            <div class="flex-1" />
          </button>
        </div>
        {opened() && props.action}
      </div>
      <div
        class={clsx(
          "flex flex-col justify-center items-start gap-2 ml-3.5 pl-3.5 w-[calc(100%-0.875rem)] border-l-2 border-gray-200 dark:border-gray-700",
          opened() ? "py-1 my-1" : "max-h-0 overflow-hidden"
        )}
      >
        <Show when={!props.mode || props.mode === "hide" || opened()}>{props.children}</Show>
      </div>
    </div>
  );
};

export { CollapsibleSection };
