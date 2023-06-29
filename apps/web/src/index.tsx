import "#styles";
import App from "./app";
import { Router } from "@solidjs/router";
import { Show, render } from "solid-js/web";
import { createConnectivitySignal } from "@solid-primitives/connectivity";
import { SVGDefs } from "#components/fragments";
import { logoIcon } from "#assets/icons";
import { IconButton } from "#components/primitives";
import {
  ClientContextProvider,
  ConfirmationContextProvider,
  NotificationsProvider,
  UIContextProvider
} from "#context";

const container = document.querySelector("#root");

if (container) {
  render(() => {
    const isOnline = createConnectivitySignal();

    return (
      <Router>
        <ClientContextProvider>
          <ConfirmationContextProvider>
            <NotificationsProvider>
              <UIContextProvider>
                <Show
                  when={isOnline()}
                  fallback={
                    <div class="flex flex-col items-center justify-center w-full h-full">
                      <div class="flex flex-col items-center justify-center">
                        <IconButton
                          path={logoIcon}
                          color="primary"
                          class="w-16 h-16 m-0 rounded-2xl"
                          iconProps={{ class: "h-12 w-12" }}
                          badge
                        />
                        <div class="flex flex-col gap-1 mt-3 text-center max-w-72">
                          <p class="font-semibold">It appears you're offline.</p>

                          <p class="text-sm text-gray-500 dark:text-gray-400">
                            Please check your internet connection.
                          </p>
                        </div>
                      </div>
                    </div>
                  }
                >
                  <div class="relative h-screen flex">
                    <SVGDefs />
                    <App />
                  </div>
                </Show>
              </UIContextProvider>
            </NotificationsProvider>
          </ConfirmationContextProvider>
        </ClientContextProvider>
      </Router>
    );
  }, container);
}
