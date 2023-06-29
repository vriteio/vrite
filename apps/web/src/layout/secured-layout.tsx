import { SidePanel } from "./side-panel";
import { Toolbar } from "./toolbar";
import { SidebarMenu } from "./sidebar-menu";
import { ParentComponent, Show, createEffect } from "solid-js";
import { useLocation } from "@solidjs/router";
import { mdiFullscreenExit } from "@mdi/js";
import {
  AppearanceManager,
  AuthenticatedContextProvider,
  ExtensionsContextProvider,
  useUIContext
} from "#context";
import { IconButton, Tooltip } from "#components/primitives";

const SecuredLayout: ParentComponent = (props) => {
  const { storage, setStorage } = useUIContext();
  const location = useLocation();

  createEffect(() => {
    if (location.pathname !== "/editor") {
      setStorage((storage) => ({ ...storage, zenMode: false }));
    }
  });

  return (
    <AuthenticatedContextProvider>
      <AppearanceManager>
        <ExtensionsContextProvider>
          <Show
            when={!storage().zenMode}
            fallback={
              <Tooltip
                wrapperClass="fixed top-0 right-0 z-50 mt-4 mr-6"
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
            }
          >
            <SidebarMenu />
          </Show>
          <div
            class="flex flex-col flex-1 h-[calc(100%-3.5rem)] md:h-full overflow-hidden"
            id="main-scrollable-container"
          >
            <div class="flex flex-1 h-full">
              <Show when={!storage().zenMode}>
                <SidePanel />
              </Show>
              <div class="flex-1 relative flex flex-col w-full">
                <Show when={!storage().zenMode}>
                  <Toolbar />
                </Show>
                <div class="absolute h-[calc(100%-3rem)] w-full top-12">{props.children}</div>
              </div>
            </div>
          </div>
        </ExtensionsContextProvider>
      </AppearanceManager>
    </AuthenticatedContextProvider>
  );
};

export { SecuredLayout };
