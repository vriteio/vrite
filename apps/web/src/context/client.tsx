import {
  createTRPCProxyClient,
  httpBatchLink,
  wsLink,
  createWSClient,
  splitLink,
  TRPCLink
} from "@trpc/client";
import { createContext, ParentComponent, useContext } from "solid-js";
import { Unsubscribable, observable } from "@trpc/server/observable";
import { useLocation } from "@solidjs/router";
import type * as App from "@vrite/backend";
import { navigateAndReload } from "#lib/utils";

const refreshTokenLink = (): TRPCLink<App.Router> => {
  return () => {
    return ({ op, next }) => {
      return observable((observer) => {
        let next$: Unsubscribable | null = null;
        let attempts = 0;
        let isDone = false;

        const attempt = async (): Promise<void> => {
          if (attempts > 0) {
            await fetch("/session/refresh", { method: "POST" });
          }

          attempts += 1;
          next$?.unsubscribe();
          next$ = next(op).subscribe({
            error(error) {
              if (
                attempts > 2 ||
                ["auth.isSignedIn", "verification"].some((value) => {
                  return op.path.startsWith(value);
                })
              ) {
                if (
                  error.data?.code === "UNAUTHORIZED" &&
                  window.location.pathname !== "/auth" &&
                  !op.path.startsWith("auth") &&
                  !op.path.startsWith("verification")
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
      refreshTokenLink(),
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
