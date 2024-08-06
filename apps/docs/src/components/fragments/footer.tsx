import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { Component, Show } from "solid-js";
import { ContentMetadata } from "vrite:pages";
import { IconButton } from "#components/primitives";

interface FooterProps {
  nextEntry: ContentMetadata | null;
  previousEntry: ContentMetadata | null;
}

const Footer: Component<FooterProps> = (props) => {
  return (
    <div class="flex flex-col lg:flex-row w-full gap-2 lg:gap-4 pt-16">
      <div class="flex-1">
        <Show when={props.previousEntry}>
          <IconButton
            label={props.previousEntry!.title}
            text="soft"
            variant="text"
            path={mdiChevronLeft}
            iconProps={{ class: "min-w-8" }}
            size="large"
            class="no-underline flex-1 m-0 justify-start"
            link={`/${props.previousEntry!.slug}`}
          />
        </Show>
      </div>
      <div class="flex-1">
        <Show when={props.nextEntry}>
          <IconButton
            label={<span class="pr-2">{props.nextEntry!.title}</span>}
            text="soft"
            variant="text"
            path={mdiChevronRight}
            iconProps={{ class: "min-w-8" }}
            size="large"
            class="flex-row-reverse no-underline m-0 justify-start"
            link={`/${props.nextEntry!.slug}`}
          />
        </Show>
      </div>
    </div>
  );
};

export { Footer };
