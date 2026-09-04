import { IconButton, Skeleton } from "@andesine/components";
import { type Component, type JSX, Show } from "solid-js";
import clsx from "clsx";
import type { DocumentLoadState } from "./document-load-state";
import { DotsBackground } from "#web/components/dots-background";

interface EditorLoadErrorViewProps {
  actionIcon: string;
  actionLabel: string;
  description: string;
  note?: JSX.Element;
  onAction(): void;
  title: string;
}

interface DocumentLoadErrorProps {
  problem: Exclude<DocumentLoadState["problem"], null>;
  localTimeoutCount: number;
  onRetry(): void;
  onBack(): void;
  resourceLabel?: string;
}

interface EditorContentSkeletonProps {
  class?: string;
}

const EDITOR_CONTENT_PADDING = "px-2.5 pb-5 pt-5 md:px-10 md:pb-10 md:pt-9";

const EditorLoadErrorView: Component<EditorLoadErrorViewProps> = (props) => {
  return (
    <div class="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 md:px-5">
      <DotsBackground class="absolute mask-edge-fading-16" />
      <div class="relative p-4 lg:p-24">
        <div class="absolute left-0 top-0 h-full w-full rounded-2xl bg-gray-100 mask-edge-fading-4 lg:mask-edge-fading-24" />
        <div class="relative flex w-72 flex-col gap-4">
          <div>
            <h1 class="text-2xl font-semibold">{props.title}</h1>
            <p class="mt-1 text-sm leading-5 text-gray-400">{props.description}</p>
            {props.note}
          </div>
          <IconButton
            icon={props.actionIcon}
            class="w-full @hover:bg-gray-50 gap-1"
            iconProps={{ class: "h-5 w-5 text-gray-400" }}
            variant="outlined"
            color="contrast"
            label={props.actionLabel}
            onClick={props.onAction}
          />
        </div>
      </div>
    </div>
  );
};

const DocumentLoadError: Component<DocumentLoadErrorProps> = (props) => {
  const isUnauthorized = () => props.problem === "unauthorized";
  const isLocalTimeout = () => props.problem === "local-timeout";

  return (
    <EditorLoadErrorView
      title={
        isUnauthorized()
          ? "Access lost"
          : isLocalTimeout()
            ? "Local content unavailable"
            : "Sync failed"
      }
      description={
        isUnauthorized()
          ? `You no longer have access to this ${props.resourceLabel || "entry"}.`
          : isLocalTimeout()
            ? "The editor could not finish loading the local copy of this document."
            : "The editor could not initialize collaboration for this document."
      }
      actionIcon={isUnauthorized() ? "i-lucide:arrow-left" : "i-lucide:rotate-cw"}
      actionLabel={isUnauthorized() ? "Back" : "Retry"}
      onAction={isUnauthorized() ? props.onBack : props.onRetry}
      note={
        <Show when={isLocalTimeout() && props.localTimeoutCount >= 2}>
          <p class="mt-2 text-xs leading-5 text-amber-600">
            The next retry will discard this document’s local content and load the server copy.
          </p>
        </Show>
      }
    />
  );
};

const EditorContentSkeleton: Component<EditorContentSkeletonProps> = (props) => (
  <div class={clsx("absolute inset-0 z-10 bg-gray-50", props.class)}>
    <div class="relative mx-auto flex w-full max-w-[44rem] flex-col gap-2">
      <Skeleton class={["h-12 w-4/5", "h-32 w-full", "h-24 w-full", "h-8 w-3/5", "h-40 w-full"]} />
      <div
        class="pointer-events-none absolute inset-0 text-gray-50"
        style={{ background: "linear-gradient(to bottom, transparent 15%, currentColor 100%)" }}
      />
    </div>
  </div>
);

export { DocumentLoadError, EDITOR_CONTENT_PADDING, EditorContentSkeleton, EditorLoadErrorView };
