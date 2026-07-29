import type { Router } from "@andesine/backend";
import { createORPCClient, onError, ORPCError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { RouterClient } from "@orpc/server";
import { createAuthClient } from "better-auth/solid";
import {
  emailOTPClient,
  inferAdditionalFields,
  multiSessionClient
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { config } from "#web/lib/config";
import { getRequestEvent } from "solid-js/web";
import { clearPersistenceData } from "#web/context/workspace/persistence";
import { validateWorkspaceID } from "#web/lib/validate";

const getRouteWorkspaceID = () => {
  if (typeof window !== "undefined") {
    const routeSegment = window.location.pathname.split("/").filter(Boolean)[0] || "";

    return validateWorkspaceID(routeSegment) ? routeSegment : "";
  }

  const event = getRequestEvent();
  const pathname = event ? new URL(event.request.url).pathname : "";
  const routeSegment = pathname.split("/").filter(Boolean)[0] || "";

  return validateWorkspaceID(routeSegment) ? routeSegment : "";
};
const link = new RPCLink({
  url: `${config.PUBLIC_API_URL}/rpc`,
  clientInterceptors: [
    onError((error) => {
      if (error instanceof ORPCError) {
        if (error.code === "UNAUTHORIZED") {
          if (typeof window !== "undefined") {
            clearPersistenceData();
            window.location.assign("/auth/sign-in");
            return;
          }

          throw error;
        }
      }
    })
  ],
  fetch: (request, init, options) => {
    const event = getRequestEvent();
    const requestHeaders = Object.fromEntries(event?.request.headers.entries() || []);
    const headers: Record<string, string> = {
      "content-type": requestHeaders["content-type"] || "application/json",
      "cookie": requestHeaders["cookie"] || ""
    };
    const workspaceID = getRouteWorkspaceID();

    if (workspaceID) {
      headers["x-workspace-id"] = workspaceID;
    }

    if (options.context.headers) {
      Object.assign(headers, options.context.headers);
    }

    return fetch(request, {
      ...init,
      credentials: "include",
      headers
    });
  }
});
const client: RouterClient<Router> = createORPCClient(link);
const authClient = createAuthClient({
  baseURL: config.PUBLIC_API_URL,
  basePath: "/auth",
  fetchOptions: {
    customFetchImpl(input, init) {
      const event = getRequestEvent();
      const requestHeaders = Object.fromEntries(event?.request.headers.entries() || []);
      const initHeaders = Object.fromEntries(new Headers(init?.headers).entries());
      const headers: Record<string, string> = {
        ...initHeaders,
        "cookie": requestHeaders["cookie"] || "",
        "content-type":
          initHeaders["content-type"] || requestHeaders["content-type"] || "application/json"
      };

      const workspaceID = getRouteWorkspaceID();

      if (workspaceID) {
        headers["x-workspace-id"] = workspaceID;
      }

      return fetch(input, {
        ...init,
        credentials: "include",
        headers
      });
    }
  },
  plugins: [
    emailOTPClient(),
    passkeyClient(),
    multiSessionClient(),
    inferAdditionalFields({ user: { currentWorkspaceID: { type: "string", required: false } } })
  ]
});

export { client, authClient };
export type * from "@andesine/backend";
