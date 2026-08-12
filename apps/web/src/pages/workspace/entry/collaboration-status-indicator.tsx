import { Spinner } from "@andesine/components";
import clsx from "clsx";
import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";

type CollaborationStatus =
  | "connecting"
  | "syncing"
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
      props.status === "syncing" ||
      props.status === "unauthorized" ||
      props.status === "failed" ||
      ((props.status === "connecting" || props.status === "offline-changes") && showDelayedStatus())
    );
  };

  createEffect(() => {
    if (props.status !== "connecting" && props.status !== "offline-changes") {
      setShowDelayedStatus(false);
      return;
    }

    if (showDelayedStatus()) return;

    const delay =
      props.status === "offline-changes" ? OFFLINE_INDICATOR_DELAY : CONNECTING_INDICATOR_DELAY;
    const timeout = setTimeout(() => setShowDelayedStatus(true), delay);

    onCleanup(() => clearTimeout(timeout));
  });

  return (
    <Show when={isVisible()}>
      <div class="absolute bottom-4 right-4 z-20 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 drop-shadow-[0_1px_1px_rgb(255_255_255)]">
        <Show
          when={props.status !== "connecting" && props.status !== "syncing"}
          fallback={<Spinner class="h-3.5 w-3.5" color="primary" />}
        >
          <div
            class={clsx("h-3.5 w-3.5", {
              "i-lucide:cloud-off bg-gradient-to-tr": props.status === "offline-changes",
              "i-lucide:shield-alert text-red-500": props.status === "unauthorized",
              "i-lucide:cloud-alert text-red-500": props.status === "failed"
            })}
          />
        </Show>
        <span>
          {props.status === "connecting" && (props.hasLocalSnapshot ? "Connecting" : "Connecting")}
          {props.status === "syncing" && "Syncing"}
          {props.status === "offline-changes" && "Offline changes saved locally"}
          {props.status === "unauthorized" && "Access lost"}
          {props.status === "failed" && "Sync failed"}
        </span>
        <Show when={props.status === "failed"}>
          <button
            type="button"
            class="font-medium text-red-600 @hover:underline"
            onClick={props.onRetry}
          >
            Retry
          </button>
        </Show>
        <Show when={props.status === "unauthorized"}>
          <button
            type="button"
            class="font-medium text-red-600 @hover:underline"
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
