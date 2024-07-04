import "#styles";
import App from "./app";
import { Show, render } from "solid-js/web";
import { createConnectivitySignal } from "@solid-primitives/connectivity";
import { SVGDefs } from "#components/fragments";
import { logoIcon } from "#assets/icons";
import { IconButton } from "#components/primitives";
import {
  ClientProvider,
  ConfirmationModalProvider,
  NotificationsProvider,
  LocalStorageProvider,
  SharedStateProvider,
  HostConfigProvider,
  MetaProvider
} from "#context";

const container = document.querySelector("#root");

if (container) {
  render(() => {
    const isOnline = createConnectivitySignal();

    return (
      <MetaProvider>
        <SharedStateProvider>
          <ClientProvider>
            <HostConfigProvider>
              <ConfirmationModalProvider>
                <NotificationsProvider>
                  <LocalStorageProvider>
                    <div class="relative h-[100dvh] flex flex-col-reverse md:flex-row">
                      <SVGDefs />
                      <App />
                    </div>
                    <Show when={!isOnline()}>
                      <div class="flex flex-col items-center justify-center w-full h-full fixed bg-gray-100 z-70">
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
                    </Show>
                  </LocalStorageProvider>
                </NotificationsProvider>
              </ConfirmationModalProvider>
            </HostConfigProvider>
          </ClientProvider>
        </SharedStateProvider>
      </MetaProvider>
    );
  }, container);
}
