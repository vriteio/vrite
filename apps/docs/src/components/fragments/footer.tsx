import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { Component, Show } from "solid-js";
import { IconButton } from "#components/primitives";

interface FooterProps {
  nextEntry?: { label: string; link: string } | null;
  previousEntry?: { label: string; link: string } | null;
}

const Footer: Component<FooterProps> = (props) => {
  return (
    <div class="flex flex-col lg:flex-row w-full gap-2 lg:gap-4 pt-16">
      <div class="flex-1">
        <Show when={props.previousEntry}>
          <IconButton
            label={props.previousEntry!.label}
            text="soft"
            path={mdiChevronLeft}
            iconProps={{ class: "min-w-8" }}
            size="large"
            class="no-underline flex-1 m-0 justify-start"
            link={props.previousEntry!.link}
          />
        </Show>
      </div>
      <div class="flex-1">
        <Show when={props.nextEntry}>
          <IconButton
            label={<span class="pr-2">{props.nextEntry!.label}</span>}
            text="soft"
            path={mdiChevronRight}
            iconProps={{ class: "min-w-8" }}
            size="large"
            class="flex-row-reverse no-underline m-0 justify-start"
            link={props.nextEntry!.link}
          />
        </Show>
      </div>
    </div>
  );
};

export { Footer };
