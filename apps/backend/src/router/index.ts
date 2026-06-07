import { billingRouter } from "./billing";
import { collectionsRouter } from "./collections";
import { entriesRouter } from "./entries";
import { syncRouter } from "./sync";
import { keysRouter } from "./keys";
import { rolesRouter } from "./roles";
import { membershipsRouter } from "./memberships";
import { workspacesRouter } from "./workspaces";
import { authRouter } from "./auth";
import { FastifyPluginAsync } from "fastify";
import { OpenAPIHandler } from "@orpc/openapi/fastify";
import { RequestHeadersPlugin, ResponseHeadersPlugin } from "@orpc/server/plugins";
import { onError, ORPCError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fastify";

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
