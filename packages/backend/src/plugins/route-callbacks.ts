import { RouteCallbackHandler, RouteCallbackHandlers, RouteCallbacksPlugin } from "fastify";
import { createPlugin } from "#lib/plugin";

declare module "fastify" {
  interface RouteCallbacks {}

  type RouteCallbackHandler<R extends keyof RouteCallbacks> = (
    ctx: RouteCallbacks[R]["ctx"],
    data: RouteCallbacks[R]["data"]
  ) => void;
  type RouteCallbackHandlers = {
    [R in keyof RouteCallbacks]?: RouteCallbackHandler<R>[];
  };

  interface RouteCallbacksPlugin {
    register: <R extends keyof RouteCallbacks>(route: R, handler: RouteCallbackHandler<R>) => void;
    run: <R extends keyof RouteCallbacks>(
      route: R,
      ctx: RouteCallbacks[R]["ctx"],
      data: RouteCallbacks[R]["data"]
    ) => void;
  }
  interface FastifyInstance {
    routeCallbacks: RouteCallbacksPlugin;
  }
}

interface Callbacks {}

const routeCallbacksPlugin = createPlugin(async (fastify) => {
  const handlers: RouteCallbackHandlers = {};
  const register = <R extends keyof Callbacks>(
    route: R,
    handler: (ctx: Callbacks[R]["ctx"], data: Callbacks[R]["data"]) => {}
  ): void => {
    if (!handlers[route]) handlers[route] = [] as RouteCallbackHandlers[R];

    handlers[route]?.push(handler);
  };
  const run = <R extends keyof Callbacks>(
    route: R,
    ctx: Callbacks[R]["ctx"],
    data: Callbacks[R]["data"]
  ): void => {
    // Run after the response is sent
    setTimeout(() => {
      handlers[route]?.forEach((handler) => handler(ctx, data));
    }, 0);
  };

  fastify.decorate("routeCallbacks", {
    register,
    run
  } as RouteCallbacksPlugin);
});

export { routeCallbacksPlugin };
export type { Callbacks };
