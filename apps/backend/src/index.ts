import fs from "node:fs/promises";
import path from "node:path";
import { type router, routerPlugin } from "#backend/router";
import "./events";
import { collab, shutdownCollaboration } from "#backend/collaboration";
import { config } from "#backend/lib/config";
import Fastify, { type FastifyRequest } from "fastify";
import corsPlugin from "@fastify/cors";
import websocketPlugin from "@fastify/websocket";
import { webhooksPlugin } from "./webhooks";
import { auth, pool } from "#backend/lib/adapters";
import { redis, subscriberRedis } from "#backend/lib/adapters";
import { RATE_LIMITS, consumeRateLimit } from "#backend/lib/security";
import { startAutomaticVersionQueue, stopAutomaticVersionQueue } from "#backend/lib/versioning";

const allowedOrigins = [...new Set([config.PUBLIC_APP_URL, config.PUBLIC_API_URL])];
const allowedMethods = ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"];
const allowedHeaders = [
  "Content-Type",
  "Authorization",
  "If-None-Match",
  "X-Workspace-ID",
  "X-Requested-With",
  "X-Session-Verification",
  "X-Session-Verification-Callback"
];
const exposedHeaders = [
  "ETag",
  "Retry-After",
  "X-API-Usage",
  "X-API-Usage-Limit",
  "X-API-Usage-Reset",
  "X-RateLimit-Limit",
  "X-RateLimit-Remaining",
  "X-RateLimit-Reset"
];
const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3333);
const httpsKeyPath = process.env.HTTPS_KEY_PATH;
const httpsCertPath = process.env.HTTPS_CERT_PATH;
const hasIncompleteHTTPSConfig = Boolean(httpsKeyPath) !== Boolean(httpsCertPath);

if (hasIncompleteHTTPSConfig) {
  throw new Error("HTTPS_KEY_PATH and HTTPS_CERT_PATH must be set together");
}

const httpsEnabled = httpsKeyPath && httpsCertPath;
const app = Fastify({
  bodyLimit: 1_048_576,
  keepAliveTimeout: 10_000,
  maxRequestsPerSocket: 100,
  requestTimeout: 30_000,
  ...(httpsEnabled && {
    https: {
      key: await fs.readFile(path.resolve("../..", httpsKeyPath)),
      cert: await fs.readFile(path.resolve("../..", httpsCertPath))
    }
  })
});
const SHUTDOWN_TIMEOUT_MS = 10_000;
let isShuttingDown = false;
const createWebRequest = (fastifyRequest: FastifyRequest): Request => {
  const url = new URL(
    fastifyRequest.url,
    `${config.PUBLIC_SECURE ? "https" : "http"}://${fastifyRequest.headers.host}`
  );
  const hasBody = !["GET", "HEAD"].includes(fastifyRequest.method);
  const body = fastifyRequest.body;

  let webBody: string | null = null;

  if (hasBody && body) {
    webBody = JSON.stringify(body);
  }

  const headers = new Headers(fastifyRequest.headers as HeadersInit);

  headers.set("x-client-ip", fastifyRequest.ip);

  return new Request(url, {
    method: fastifyRequest.method,
    headers,
    ...(webBody && { body: webBody })
  });
};

await app.register(corsPlugin, {
  origin: allowedOrigins,
  methods: allowedMethods,
  allowedHeaders: allowedHeaders,
  exposedHeaders,
  credentials: true,
  maxAge: 86400
});
await app.register(websocketPlugin, {
  options: { maxPayload: 1048576 }
});
app.get("/health", async (_request, reply) => {
  const [postgresResult, redisResult] = await Promise.allSettled([
    pool.query("SELECT 1"),
    redis.ping()
  ]);
  const checks = {
    postgres: postgresResult.status === "fulfilled" ? "ok" : "unavailable",
    redis: redisResult.status === "fulfilled" ? "ok" : "unavailable"
  } as const;
  const ready = !isShuttingDown && checks.postgres === "ok" && checks.redis === "ok";

  return reply.status(ready ? 200 : 503).send({
    status: ready ? "ok" : "unavailable",
    checks
  });
});
app.get(
  "/collab",
  {
    websocket: true,
    preValidation: async (request, reply) => {
      const limit = await consumeRateLimit({
        scope: "collaboration",
        key: request.ip,
        limit: RATE_LIMITS.collaboration
      });

      if (!limit.allowed) {
        return reply
          .status(429)
          .header("Retry-After", limit.retryAfter)
          .send({ error: "Too many connection attempts. Please try again later." });
      }
    }
  },
  (socket, request) => {
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
  }
);
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
startAutomaticVersionQueue();

console.log(`Server is running on ${httpsEnabled ? "https" : "http"}://${host}:${port}`);

let shutdownPromise: Promise<void> | undefined;
const shutdown = (): Promise<void> => {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    isShuttingDown = true;
    let exitCode = 0;
    const appClose = app.close().catch((error) => {
      exitCode = 1;
      console.error("Failed to close the HTTP server", error);
    });
    const versionQueueClose = stopAutomaticVersionQueue().catch((error) => {
      exitCode = 1;
      console.error("Failed to stop the automatic version queue", error);
    });
    try {
      const collaborationClosed = await shutdownCollaboration(SHUTDOWN_TIMEOUT_MS);

      if (!collaborationClosed) {
        exitCode = 1;
        console.error("Timed out waiting for collaboration documents to persist");
      }
    } catch (error) {
      exitCode = 1;
      console.error("Failed to shut down collaboration", error);
    }

    await Promise.all([appClose, versionQueueClose]);
    const dependencies = await Promise.allSettled([
      redis.close(),
      subscriberRedis.close(),
      pool.end()
    ]);

    for (const dependency of dependencies) {
      if (dependency.status === "rejected") {
        exitCode = 1;
        console.error("Failed to close a server dependency", dependency.reason);
      }
    }

    process.exit(exitCode);
  })();

  return shutdownPromise;
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export type Router = typeof router;
export type * from "#backend/db";
export type * from "#backend/events";
export type * from "#backend/lib/policy/actions";
