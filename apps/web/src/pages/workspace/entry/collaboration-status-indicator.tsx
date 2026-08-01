// TODO: redesign
import { Spinner } from "@andesine/components";
import { Component, createEffect, createSignal, onCleanup, Show } from "solid-js";

type CollaborationStatus =
  | "connecting"
  | "saved-locally"
  | "synced"
  | "offline-changes"
  | "unauthorized"
  | "failed";

const CONNECTING_INDICATOR_DELAY = 1500;
const OFFLINE_INDICATOR_DELAY = 2000;

interface CollaborationStatusIndicatorProps {
  status: CollaborationStatus;
  hasLocalSnapshot: boolean;
  onRetry(): void;
  onBack(): void;
}

const CollaborationStatusIndicator: Component<CollaborationStatusIndicatorProps> = (props) => {
  const [showDelayedStatus, setShowDelayedStatus] = createSignal(false);
  const isVisible = () => {
    return (
      props.status === "unauthorized" ||
      props.status === "failed" ||
      ((props.status === "connecting" || props.status === "offline-changes") && showDelayedStatus())
    );
  };

  createEffect(() => {
    setShowDelayedStatus(false);

    if (props.status !== "connecting" && props.status !== "offline-changes") return;

    const delay =
      props.status === "offline-changes" ? OFFLINE_INDICATOR_DELAY : CONNECTING_INDICATOR_DELAY;
    const timeout = setTimeout(() => setShowDelayedStatus(true), delay);

    onCleanup(() => clearTimeout(timeout));
  });

  return (
    <Show when={isVisible()}>
      <div class="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-950/95 dark:text-gray-300">
        <Show
          when={props.status !== "connecting"}
          fallback={<Spinner class="h-3.5 w-3.5" color="primary" />}
        >
          <div
            classList={{
              "i-lucide:cloud-off text-amber-600 dark:text-amber-400":
                props.status === "offline-changes",
              "i-lucide:shield-alert text-red-600 dark:text-red-400":
                props.status === "unauthorized",
              "i-lucide:cloud-alert text-red-600 dark:text-red-400": props.status === "failed"
            }}
            class="h-3.5 w-3.5"
          />
        </Show>
        <span>
          {props.status === "connecting" &&
            (props.hasLocalSnapshot ? "Saved locally · Connecting" : "Connecting")}
          {props.status === "offline-changes" && "Offline changes saved locally"}
          {props.status === "unauthorized" && "Access lost"}
          {props.status === "failed" && "Sync failed"}
        </span>
        <Show when={props.status === "failed"}>
          <button
            type="button"
            class="font-medium text-red-600 hover:underline dark:text-red-400"
            onClick={props.onRetry}
          >
            Retry
          </button>
        </Show>
        <Show when={props.status === "unauthorized"}>
          <button
            type="button"
            class="font-medium text-red-600 hover:underline dark:text-red-400"
            onClick={props.onBack}
          >
            Back
          </button>
        </Show>
      </div>
    </Show>
  );
};

export { CollaborationStatusIndicator };
export type { CollaborationStatus };
