import { billingRouter } from "./billing";
import { collectionsRouter } from "./collections";
import { contentRouter } from "./content";
import { entriesRouter } from "./entries";
import { groupsRouter } from "./groups";
import { syncRouter } from "./sync";
import { keysRouter } from "./keys";
import { rolesRouter } from "./roles";
import { membershipsRouter } from "./memberships";
import { publishingRouter } from "./publishing";
import { workspacesRouter } from "./workspaces";
import { versionsRouter } from "./versions";
import { authRouter } from "./auth";
import { type FastifyPluginAsync, type FastifyReply, type FastifyRequest } from "fastify";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { RequestHeadersPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { RATE_LIMITS, consumeRateLimit } from "#backend/lib/security";
import { config } from "#backend/lib/config";

const router = {
  auth: authRouter,
  entries: entriesRouter,
  groups: groupsRouter,
  collections: collectionsRouter,
  content: contentRouter,
  billing: billingRouter,
  keys: keysRouter,
  roles: rolesRouter,
  memberships: membershipsRouter,
  publishing: publishingRouter,
  workspaces: workspacesRouter,
  versions: versionsRouter,
  sync: syncRouter
};
const routerPlugin: FastifyPluginAsync = async (app) => {
  const method = ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"];
  const limitInviteAcceptance = async (req: FastifyRequest, reply: FastifyReply) => {
    const pathname = req.url.split("?")[0];

    if (pathname !== "/memberships/accept" && pathname !== "/rpc/memberships/acceptInvite") {
      return;
    }

    const limit = await consumeRateLimit({
      scope: "invite-acceptance",
      key: req.ip,
      limit: RATE_LIMITS.inviteAcceptance
    });

    if (!limit.allowed) {
      return reply
        .status(429)
        .header("Retry-After", limit.retryAfter)
        .send({ error: "Too many invite attempts. Please try again later." });
    }
  };
  const logORPCError = (error: unknown, options?: unknown) => {
    if (error instanceof ORPCError) {
      const cause = (error as { cause?: unknown }).cause;

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
    plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
    interceptors: [
      onError((error, options) => {
        logORPCError(error, options);
      })
    ]
  });
  const rpcHandler = new RPCHandler(router, {
    plugins: [new RequestHeadersPlugin(), new ResponseHeadersPlugin()],
    interceptors: [
      onError((error, options) => {
        logORPCError(error, options);
      })
    ]
  });
  const openAPIDocument = await new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()]
  }).generate(router, {
    filter: ({ contract }) => Boolean(contract["~orpc"].meta.required?.key),
    info: {
      title: "Andesine API",
      version: "1.0.0"
    },
    servers: [{ url: config.PUBLIC_API_URL }],
    security: [{ apiKey: [] }],
    components: {
      securitySchemes: {
        apiKey: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Andesine API key",
          description: "Use an Andesine API key as a Bearer token"
        }
      }
    }
  });

  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", function (_request, _payload, done) {
    done(null, undefined);
  });
  app.get("/openapi.json", async (_request, reply) => {
    return reply.send(openAPIDocument);
  });
  app.route({
    url: "/rpc/*",
    method,
    preHandler: limitInviteAcceptance,
    handler: async (req, reply) => {
      const { matched } = await rpcHandler.handle(req, reply, {
        prefix: "/rpc",
        context: {} // Provide initial context if needed
      });

      if (!matched) {
        reply.status(404).send("Not found");
      }
    }
  });
  app.route({
    url: "/*",
    method,
    preHandler: limitInviteAcceptance,
    handler: async (req, reply) => {
      const { matched } = await openAPIHandler.handle(req, reply, {
        prefix: "/",
        context: {} // Provide initial context if needed
      });

      if (!matched) {
        reply.status(404).send("Not found");
      }
    }
  });
};

export { router, routerPlugin };
