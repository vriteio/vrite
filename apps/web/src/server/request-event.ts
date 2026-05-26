import type { RequestEvent } from "solid-js/web";

interface RouterRequestState {
  cache: Map<string, unknown>;
  data: Record<string, unknown>;
  dataOnly?: boolean | string[];
  matches?: unknown[];
  submission?: {
    input: unknown;
    result: unknown;
    url: string;
  };
  previousUrl?: string;
}

interface AppRequestEvent extends RequestEvent {
  response: {
    status?: number;
    statusText?: string;
    headers: Headers;
  };
  router: RouterRequestState;
  serverOnly?: boolean;
}

const createRequestEvent = (
  request: Request,
  locals: Record<string | number | symbol, unknown> = {}
): AppRequestEvent => {
  return {
    request,
    locals,
    response: {
      headers: new Headers()
    },
    router: {
      cache: new Map(),
      data: {}
    },
    serverOnly: false
  };
};

export { createRequestEvent };
export type { AppRequestEvent };
