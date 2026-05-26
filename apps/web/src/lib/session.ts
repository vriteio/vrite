import { getRequestEvent } from "solid-js/web";
import { config } from "#web/lib/config";
import type { AppRequestEvent } from "#web/server/request-event";

interface SessionData {
  session?: unknown;
  user?: {
    currentWorkspaceID?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const copyAuthResponseHeaders = (response: Response) => {
  const event = getRequestEvent() as AppRequestEvent | undefined;
  const responseHeaders = event?.response?.headers;

  if (!responseHeaders) {
    return;
  }

  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      responseHeaders.append(key, value);
    } else {
      responseHeaders.set(key, value);
    }
  }

  if (!event.response.status) {
    event.response.status = response.status;
  }

  if (!event.response.statusText) {
    event.response.statusText = response.statusText;
  }
};

const getSessionData = async (request?: Request): Promise<SessionData | null> => {
  if (!import.meta.env.SSR) {
    const { authClient } = await import("#web/lib/client");
    const { data } = await authClient.getSession();

    return (data as SessionData | null) ?? null;
  }

  if (!config.PUBLIC_API_HOST) {
    return null;
  }

  const activeRequest = request ?? getRequestEvent()?.request;

  if (!activeRequest) {
    return null;
  }

  const headers = new Headers();
  const cookie = activeRequest.headers.get("cookie");
  const workspaceID = activeRequest.headers.get("x-workspace-id");

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (workspaceID) {
    headers.set("x-workspace-id", workspaceID);
  }

  try {
    const response = await fetch(`${config.PUBLIC_API_URL}/auth/get-session`, {
      method: "GET",
      credentials: "include",
      headers
    });

    copyAuthResponseHeaders(response);

    if (!response.ok) {
      return null;
    }

    const payload = await response.text();

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as SessionData;
  } catch {
    return null;
  }
};

export { getSessionData };
export type { SessionData };
