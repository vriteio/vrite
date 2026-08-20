import clsx from "clsx";
import { For, type ParentComponent } from "solid-js";
import { Button } from "./button";

interface TagListProps {
  class?: string;
  valueClass?: string;
  values: string[];
  disabled?: boolean;
  setValues?(values: string[]): void;
}

const TagList: ParentComponent<TagListProps> = (props) => {
  const removeValue = (value: string) => {
    props.setValues?.(props.values.filter((currentValue) => currentValue !== value));
  };

  return (
    <div class={clsx(":base: flex w-full min-w-0 flex-wrap items-center gap-1", props.class)}>
      <For each={props.values}>
        {(value) => (
          <Button
            size="small"
            color="contrast"
            variant="outlined"
            hover="none"
            text="softer"
            class={clsx(
              ":base-2: flex max-w-full items-center gap-1 p-0.5 pl-1.5 pr-0.5 group/tag",
              props.disabled && ":base-2: cursor-default opacity-70",
              props.valueClass
            )}
            onClick={(event) => {
              event.stopPropagation();

              if (!props.disabled) removeValue(value);
            }}
          >
            <span class=":base: truncate">{value}</span>
            <span
              aria-hidden="true"
              class=":base: inline-flex justify-center items-center h-5 w-5 shrink-0 rounded-md media-mouse:group-hover/tag:bg-red-500/10"
            >
              <span class=":base: i-lucide:x h-4 w-4 text-gray-400 media-mouse:group-hover/tag:text-red-500" />
            </span>
          </Button>
        )}
      </For>
      {props.children}
    </div>
  );
};

export { TagList };
