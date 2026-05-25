import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { router } from "#backend/router";
import "./events";
import { contentsDB } from "#backend/db";
import { toObjectID } from "./lib/mongo";
import { Binary } from "mongodb";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { CORSPlugin, RequestHeadersPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { serve } from "crossws/server";
import { auth } from "./lib/auth";
import { config } from "./lib/config";
import { Billing } from "./services";
import { handleStripeWebhook } from "./webhooks/stripe";
import { ServerMiddleware } from "srvx";

const allowedOrigins = new Set([config.PUBLIC_APP_URL, config.PUBLIC_API_URL]);
const resolveAllowedOrigin = (origin?: string) => {
  return origin && allowedOrigins.has(origin) ? origin : config.PUBLIC_APP_URL;
};
const corsHeaders = {
  allowCredentials: "true",
  allowMethods: "GET, HEAD, PUT, POST, DELETE, PATCH, OPTIONS",
  allowHeaders: "Content-Type, Authorization, X-Workspace-ID"
};
const applyCORSHeaders = (response: Response, origin?: string) => {
  response.headers.set("Access-Control-Allow-Origin", resolveAllowedOrigin(origin));
  response.headers.set("Access-Control-Allow-Credentials", corsHeaders.allowCredentials);
  response.headers.set("Access-Control-Allow-Methods", corsHeaders.allowMethods);
  response.headers.set("Access-Control-Allow-Headers", corsHeaders.allowHeaders);
  response.headers.set("Vary", "Origin");

  return response;
};
const logORPCError = (error: unknown, options?: unknown) => {
  if (error instanceof ORPCError) {
    const cause = (error as any).cause;

    console.error(error.message, {
      code: error.code,
      cause,
      options
    });
    return;
  }

  console.error(error, { options });
};
const openAPIHandler = new OpenAPIHandler(router, {
  plugins: [
    new RequestHeadersPlugin(),
    new ResponseHeadersPlugin(),
    new CORSPlugin({
      credentials: true,
      origin: (origin) => resolveAllowedOrigin(origin),
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"]
    })
  ],
  interceptors: [
    onError((error, options) => {
      logORPCError(error, options);
    })
  ]
});
const rpcHandler = new RPCHandler(router, {
  plugins: [
    new RequestHeadersPlugin(),
    new ResponseHeadersPlugin(),
    new CORSPlugin({
      credentials: true,
      origin: (origin) => resolveAllowedOrigin(origin),
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"]
    })
  ],
  interceptors: [
    onError((error, options) => {
      logORPCError(error, options);
    })
  ]
});
const hocuspocus = new Hocuspocus({
  extensions: [
    new Database({
      async fetch({ documentName }) {
        if (documentName === "explorer") return null;
        const entryID = documentName;
        const content = await contentsDB.findOne({
          entryID: toObjectID(entryID)
        });

        if (content && content.content) {
          return new Uint8Array(content.content.buffer);
        }

        return null;
      },
      async store({ documentName, state }) {
        await contentsDB?.updateOne(
          { entryID: toObjectID(documentName) },
          { $set: { content: new Binary(state) } },
          { upsert: true }
        );
      }
    })
  ]
});
const cors: ServerMiddleware = async (req, next) => {
  const origin = req.headers.get("origin") || "";
  const response = await next();
  const pathname = new URL(req.url).pathname;

  if (pathname.startsWith("/rpc")) {
    return response;
  }

  return applyCORSHeaders(response, origin);
};

const clientConnections = new Map<string, ReturnType<Hocuspocus["handleConnection"]>>();

serve({
  middleware: [cors],
  websocket: {
    resolve: (req) => {
      const url = new URL(req.url);
      const method = req.method.toUpperCase();

      if (method === "GET" && url.pathname.startsWith("/collab")) {
        return {
          open(peer) {
            const wsLike = {
              get readyState() {
                return peer.websocket.readyState ?? 3; // 3 = CLOSED
              },
              send(data: Uint8Array) {
                peer.send(data);
              },
              close(code?: number, reason?: string) {
                peer.close(code, reason);
              }
            };
            const clientConnection = hocuspocus.handleConnection(wsLike, peer.request as Request);

            clientConnections.set(peer.id, clientConnection);
          },
          message(peer, message) {
            clientConnections.get(peer.id)?.handleMessage(message.uint8Array());
          },
          close(peer, event) {
            clientConnections.get(peer.id)?.handleClose({
              code: event.code || 1000,
              reason: event.reason || "Normal Closure"
            });
          },
          error(peer, error) {
            console.error("WebSocket error for peer:", peer.id);
            console.error(error);
          }
        };
      }

      return {};
    }
  },
  fetch: async (req) => {
    const url = new URL(req.url);
    const method = req.method.toUpperCase();

    if (method === "OPTIONS") {
      const origin = req.headers.get("origin") || "";

      return applyCORSHeaders(new Response(null, { status: 204 }), origin);
    }

    if (url.pathname.startsWith("/webhooks/stripe")) {
      return handleStripeWebhook(req);
    }

    if (url.pathname.startsWith("/rpc")) {
      const { matched, response } = await rpcHandler.handle(req, {
        prefix: "/rpc",
        context: {}
      });

      if (matched) {
        return response;
      }

      return new Response("Not found", { status: 404 });
    }

    if (url.pathname.startsWith("/auth/")) {
      return auth.handler(req);
    }

    const { matched, response } = await openAPIHandler.handle(req, {
      prefix: "/",
      context: {}
    });

    if (matched) {
      return response;
    }

    return new Response("Not found", { status: 404 });
  },
  port: Number(process.env.PORT || 3333)
});

const shutdown = async (): Promise<void> => {
  await Billing.Metering.flushUsage();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export type Router = typeof router;
export type * from "#backend/db";
export type * from "#backend/events";
