import { Spinner } from "@andesine/components";
import { type Component, Show } from "solid-js";

interface ExplorerSyncStatusIndicatorProps {
  channel?: string;
  offline: boolean;
  syncing: boolean;
}

const ExplorerSyncStatusIndicator: Component<ExplorerSyncStatusIndicatorProps> = (props) => {
  const label = () => (props.offline ? "Offline" : props.syncing ? "Syncing" : props.channel);

  return (
    <Show when={props.offline || props.syncing || props.channel}>
      <div class="flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs">
        <Show
          when={props.offline}
          fallback={
            <Show
              when={props.syncing}
              fallback={<div class="i-lucide:radio h-3.5 w-3.5 bg-gradient-to-tr" />}
            >
              <Spinner class="h-3.5 w-3.5" color="primary" />
            </Show>
          }
        >
          <div class="i-lucide:cloud-off h-3.5 w-3.5 bg-gradient-to-tr" />
        </Show>
        <span class="max-w-28 truncate text-gray-500">{label()}</span>
      </div>
    </Show>
  );
};

export { ExplorerSyncStatusIndicator };
