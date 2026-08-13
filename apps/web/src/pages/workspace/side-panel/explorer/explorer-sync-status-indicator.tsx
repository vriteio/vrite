import { Spinner } from "@andesine/components";
import { type Component, Show } from "solid-js";

interface ExplorerSyncStatusIndicatorProps {
  offline: boolean;
  syncing: boolean;
}

const ExplorerSyncStatusIndicator: Component<ExplorerSyncStatusIndicatorProps> = (props) => {
  return (
    <Show when={props.offline || props.syncing}>
      <div class="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs">
        <Show when={props.offline} fallback={<Spinner class="h-3.5 w-3.5" color="primary" />}>
          <div class="i-lucide:cloud-off h-3.5 w-3.5 bg-gradient-to-tr" />
        </Show>
        <span class="text-gray-500">{props.offline ? "Offline" : "Syncing"}</span>
      </div>
    </Show>
  );
};

export { ExplorerSyncStatusIndicator };
