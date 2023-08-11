import { mdiHexagonSlice6 } from "@mdi/js";
import { Component, Show } from "solid-js";
import { App } from "#context";
import { Overlay, Icon } from "#components/primitives";

interface WorkspaceSwitchOverlayProps {
  destinationWorkspace: null | Omit<App.Workspace, "contentGroups">;
}

const WorkspaceSwitchOverlay: Component<WorkspaceSwitchOverlayProps> = (props) => {
  return (
    <Overlay opened={Boolean(props.destinationWorkspace)} portal class="backdrop-blur-sm">
      <div class="flex flex-col justify-center items-center gap-2">
        <Show
          when={props.destinationWorkspace?.logo}
          fallback={
            <Icon
              path={mdiHexagonSlice6}
              class="h-12 w-12 text-gray-500 dark:text-gray-400 animate-pulse fill-[url(#gradient)]"
            />
          }
        >
          <img
            src={props.destinationWorkspace?.logo}
            class="h-12 w-12 bg-gray-50 dark:bg-gray-900 rounded-full border-gray-50 dark:border-gray-900 border-2 animate-pulse"
          />
        </Show>
        <div class="flex flex-col justify-center items-center gap-1 text-white">
          <span class="whitespace-nowrap font-semibold leading-4">Loading workspace</span>
          <span class="whitespace-nowrap text-sm leading-3 opacity-70">
            {props.destinationWorkspace?.name}
          </span>
        </div>
      </div>
    </Overlay>
  );
};

export { WorkspaceSwitchOverlay };
