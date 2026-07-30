import { billingRouter } from "./billing";
import { collectionsRouter } from "./collections";
import { entriesRouter } from "./entries";
import { syncRouter } from "./sync";
import { keysRouter } from "./keys";
import { rolesRouter } from "./roles";
import { membershipsRouter } from "./memberships";
import { workspacesRouter } from "./workspaces";
import { authRouter } from "./auth";
import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { RequestHeadersPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";
import { RATE_LIMITS, consumeRateLimit } from "#backend/lib/rate-limit";

const router = {
  auth: authRouter,
  entries: entriesRouter,
  collections: collectionsRouter,
  billing: billingRouter,
  keys: keysRouter,
  roles: rolesRouter,
  memberships: membershipsRouter,
  workspaces: workspacesRouter,
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

  app.removeAllContentTypeParsers();
  app.addContentTypeParser("*", function (_request, _payload, done) {
    done(null, undefined);
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
