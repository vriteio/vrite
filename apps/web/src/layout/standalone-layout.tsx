import { Toolbar } from "./toolbar";
import { ParentComponent, Show } from "solid-js";
import { mdiFullscreenExit } from "@mdi/js";
import clsx from "clsx";
import { AppearanceManager, useUIContext } from "#context";
import { IconButton, Tooltip } from "#components/primitives";

const StandaloneLayout: ParentComponent = (props) => {
  const { storage, setStorage } = useUIContext();

  document.documentElement.classList.add("sidebar-hidden");
  setStorage((storage) => ({ ...storage, toolbarView: "editorStandalone" }));

  return (
    <AppearanceManager>
      <Show when={storage().zenMode}>
        <Tooltip
          wrapperClass="fixed top-0 right-0 z-50 mt-2 md:mt-4 mr-4 md:mr-6"
          class="-ml-1"
          text="Exit Zen mode"
          side="left"
        >
          <IconButton
            path={mdiFullscreenExit}
            class="m-0"
            text="soft"
            onClick={() => {
              setStorage((storage) => ({ ...storage, zenMode: false }));
            }}
          />
        </Tooltip>
      </Show>
      <div class="flex flex-col flex-1 h-full overflow-hidden" id="main-scrollable-container">
        <div class="flex flex-1 h-full">
          <div class="flex-1 relative flex flex-col w-full">
            <Show when={!storage().zenMode}>
              <Toolbar />
            </Show>
            <div
              class={clsx(
                "absolute w-full",
                storage().zenMode ? "h-full top-0" : "h-[calc(100%-3rem)] top-12"
              )}
            >
              {props.children}
            </div>
          </div>
        </div>
      </div>
    </AppearanceManager>
  );
};

export { StandaloneLayout };
