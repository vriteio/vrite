import { IconButton } from "@andesine/components";
import { type Component } from "solid-js";

const HelpPanel: Component = () => (
  <div class="flex flex-col gap-3 flex-1 overflow-y-auto scrollbar-sm w-full px-1 pb-1">
    <h2 class="text-2xl font-semibold my-0.5">Help</h2>
    <div class="flex flex-col gap-1">
      {/* TODO: add links */}

      <IconButton
        icon="i-lucide:book-open"
        iconProps={{
          class: "h-4.5 w-4.5"
        }}
        label="API Reference"
        variant="outlined"
        color="contrast"
        size="small"
        class="px-2 justify-start gap-1"
        link="#"
      />
      {/* TODO: add link */}
      <IconButton
        icon="i-lucide:star"
        iconProps={{
          class: "h-4.5 w-4.5"
        }}
        label="Star on GitHub"
        variant="outlined"
        color="contrast"
        size="small"
        class="px-2 justify-start gap-1"
        link="#"
      />
      {/* TODO: add link */}
      <IconButton
        icon="i-lucide:message-circle"
        iconProps={{
          class: "h-4.5 w-4.5"
        }}
        label="Join Discord"
        variant="outlined"
        color="contrast"
        size="small"
        class="justify-start px-2 gap-1"
        link="#"
      />
    </div>
  </div>
);

export { HelpPanel };
