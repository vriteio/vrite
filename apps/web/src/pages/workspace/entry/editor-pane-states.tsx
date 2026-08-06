import { IconButton, Skeleton } from "@andesine/components";
import { type Component, Show } from "solid-js";
import type { EntryLoadState } from "./entry-load-state";

interface EntryLoadErrorProps {
  problem: Exclude<EntryLoadState["problem"], null>;
  localTimeoutCount: number;
  onRetry(): void;
  onBack(): void;
}

const EntryLoadError: Component<EntryLoadErrorProps> = (props) => {
  const isUnauthorized = () => props.problem === "unauthorized";
  const isLocalTimeout = () => props.problem === "local-timeout";
  return (
    <div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 px-5 dark:bg-gray-950">
      <div class="dots-background absolute mask-edge-fading-16" />
      <div class="relative p-4 lg:p-24">
        <div class="absolute left-0 top-0 h-full w-full rounded-2xl bg-gray-100 mask-edge-fading-4 dark:bg-gray-850 lg:mask-edge-fading-24" />
        <div class="relative flex w-72 flex-col gap-4">
          <div>
            <h1 class="text-2xl font-semibold">
              {isUnauthorized()
                ? "Access lost"
                : isLocalTimeout()
                  ? "Local content unavailable"
                  : "Sync failed"}
            </h1>
            <p class="mt-1 text-sm leading-5 text-gray-400 dark:text-gray-500">
              {isUnauthorized()
                ? "You no longer have access to this entry."
                : isLocalTimeout()
                  ? "The editor could not finish loading the local copy of this document."
                  : "The editor could not initialize collaboration for this document."}
            </p>
            <Show when={isLocalTimeout() && props.localTimeoutCount >= 2}>
              <p class="mt-2 text-xs leading-5 text-amber-600 dark:text-amber-400">
                The next retry will discard this document’s local content and load the server copy.
              </p>
            </Show>
          </div>
          <IconButton
            icon={isUnauthorized() ? "i-lucide:arrow-left" : "i-lucide:rotate-cw"}
            class="w-full @hover:bg-gray-50 gap-1"
            iconProps={{ class: "h-5 w-5 text-gray-400 dark:text-gray-500" }}
            variant="outlined"
            color="contrast"
            label={isUnauthorized() ? "Back" : "Retry"}
            onClick={isUnauthorized() ? props.onBack : props.onRetry}
          />
        </div>
      </div>
    </div>
  );
};

const EntryContentSkeleton: Component = () => (
  <div class="absolute inset-0 z-10 bg-gray-50 dark:bg-gray-950 p-10 pt-16">
    <div class="relative mx-auto flex w-full max-w-[44rem] flex-col gap-2">
      <Skeleton class={["h-12 w-4/5", "h-32 w-full", "h-24 w-full", "h-8 w-3/5", "h-40 w-full"]} />
      <div
        class="pointer-events-none absolute inset-0 text-gray-50 dark:text-gray-950"
        style={{ background: "linear-gradient(to bottom, transparent 15%, currentColor 100%)" }}
      />
    </div>
  </div>
);

export { EntryContentSkeleton, EntryLoadError };
