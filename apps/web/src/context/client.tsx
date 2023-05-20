import {
  createTRPCProxyClient,
  httpBatchLink,
  wsLink,
  createWSClient,
  splitLink,
  TRPCLink
} from "@trpc/client";
import { createContext, onCleanup, ParentComponent, useContext } from "solid-js";
import { Unsubscribable, observable } from "@trpc/server/observable";
import type * as App from "@vrite/backend";
import { navigateAndReload } from "#lib/utils";

const refreshTokenLink = (closeConnection: () => void): TRPCLink<App.Router> => {
  let refreshingPromise: Promise<any> | null = null;

  return () => {
    return ({ op, next }) => {
      return observable((observer) => {
        let next$: Unsubscribable | null = null;
        let attempts = 0;
        let isDone = false;

        const attempt = async (): Promise<void> => {
          if (attempts > 0 && !refreshingPromise) {
            refreshingPromise = fetch("/session/refresh", { method: "POST" }).then(() => {
              refreshingPromise = null;
              closeConnection();
            });
          }

          next$?.unsubscribe();
          attempts += 1;

          if (refreshingPromise) {
            await refreshingPromise;
          }

          next$ = next(op).subscribe({
            error(error) {
              if (
                attempts > 3 ||
                ["auth.isSignedIn", "userSettings.getWorkspaceId", "verification"].some((value) => {
                  return op.path.startsWith(value);
                })
              ) {
                if (
                  error.data?.code === "UNAUTHORIZED" &&
                  window.location.pathname !== "/auth" &&
                  !op.path.startsWith("auth") &&
                  !op.path.startsWith("verification") &&
                  !refreshingPromise
                ) {
                  navigateAndReload("/auth");

                  return;
                }

                observer.error(error);

                return;
              }

              attempt();
            },
            next(result) {
              observer.next(result);
            },
            complete() {
              if (isDone) {
                observer.complete();
              }
            }
          });
        };

        attempt();

        return () => {
          isDone = true;
          next$?.unsubscribe();
        };
      });
    };
  };
};

interface ClientContextData {
  client: ReturnType<typeof createTRPCProxyClient<App.Router>>;
}

const ClientContext = createContext<ClientContextData>();
const ClientContextProvider: ParentComponent = (props) => {
  const wsClient = createWSClient({
    url: `ws${window.location.protocol.includes("https") ? "s" : ""}://${
      import.meta.env.VITE_APP_HOST || "app.vrite.io"
    }/api/v1`
  });
  const client = createTRPCProxyClient<App.Router>({
    links: [
      refreshTokenLink(() => {
        wsClient.getConnection().dispatchEvent(new CloseEvent("close"));
      }),
      splitLink({
        condition(op) {
          return !op.path.startsWith("auth") && !op.path.startsWith("verification");
        },
        true: wsLink({ client: wsClient }),
        false: httpBatchLink({
          url: "/api/v1"
        })
      })
    ]
  });
  const keepAliveHandle = setInterval(() => {
    if (wsClient.getConnection().readyState === WebSocket.OPEN) {
      wsClient.getConnection().send("[]");
    }
  }, 45 * 1000);

  onCleanup(() => {
    clearInterval(keepAliveHandle);
  });

  return (
    <ClientContext.Provider
      value={{
        client
      }}
    >
      {props.children}
    </ClientContext.Provider>
  );
};
const useClientContext = (): ClientContextData => {
  return useContext(ClientContext)!;
};

export { ClientContextProvider, useClientContext };
export type { App };
