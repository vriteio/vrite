import { router, routerPlugin } from "#backend/router";
import "./events";
import { collab } from "#backend/collaboration";
import { config } from "./lib/config";
import { Billing } from "./services";
import Fastify, { FastifyRequest } from "fastify";
import corsPlugin from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { webhooksPlugin } from "./webhooks";
import { auth } from "./lib/auth";

const allowedOrigins = [...new Set([config.PUBLIC_APP_URL, config.PUBLIC_API_URL])];
const allowedMethods = ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"];
const allowedHeaders = [
  "Content-Type",
  "Authorization",
  "X-Workspace-ID",
  "X-Requested-With",
  "X-Session-Verification",
  "X-Session-Verification-Callback"
];
const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3333);
const app = Fastify();
const createWebRequest = (fastifyRequest: FastifyRequest): Request => {
  const url = new URL(
    fastifyRequest.url,
    `${config.PUBLIC_SECURE ? "https" : "http"}://${fastifyRequest.headers.host}`
  );
  const hasBody = !["GET", "HEAD"].includes(fastifyRequest.method);
  const body = fastifyRequest.body;

  let webBody: any = null;

  if (hasBody && body) {
    webBody = JSON.stringify(body);
  }

  return new Request(url, {
    method: fastifyRequest.method,
    // @ts-expect-error
    headers: new Headers(fastifyRequest.headers),
    ...(webBody && { body: webBody })
  });
};

await app.register(corsPlugin, {
  origin: allowedOrigins,
  methods: allowedMethods,
  allowedHeaders: allowedHeaders,
  credentials: true,
  maxAge: 86400
});
await app.register(websocketPlugin, {
  options: { maxPayload: 1048576 }
});
app.get("/collab", { websocket: true }, (socket, request) => {
  const webRequest = createWebRequest(request);
  const clientConnection = collab.handleConnection(socket, webRequest);

  socket.on("message", (message) => {
    clientConnection.handleMessage(new Uint8Array(message as ArrayBuffer));
  });
  socket.on("close", (code) => {
    clientConnection.handleClose({
      code: code || 1000,
      reason: "Normal Closure"
    });
  });
  socket.on("error", (error) => {
    console.error(error);
  });
});
app.route({
  method: ["GET", "POST"],
  url: "/auth/*",
  handler: async (request, reply) => {
    try {
      const webRequest = createWebRequest(request);
      const webResponse = await auth.handler(webRequest);

      reply.status(webResponse.status);

      for (const [key, value] of webResponse.headers) {
        reply.header(key, value);
      }

      return reply.send(webResponse.body ? webResponse.body : null);
    } catch (error) {
      console.error("Authentication error:", error);
      return reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE"
      });
    }
  }
});
app.register(webhooksPlugin);
app.register(routerPlugin);

await app.listen({
  host,
  port
});

console.log(`Server is running on ${host}:${port}`);

const shutdown = async (): Promise<void> => {
  await Billing.Metering.flushUsage();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export type Router = typeof router;
export type * from "#backend/db";
export type * from "#backend/events";
