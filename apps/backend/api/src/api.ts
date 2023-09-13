import { publicPlugin, appRouter, createContext } from "@vrite/backend";
import rateLimitPlugin from "@fastify/rate-limit";
import {
  createOpenApiNodeHttpHandler,
  CreateOpenApiNodeHttpHandlerOptions
} from "trpc-openapi/dist/adapters/node-http/core";
import corsPlugin from "@fastify/cors";
import { OpenApiRouter } from "trpc-openapi";
import { AnyRouter } from "@trpc/server";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type CreateOpenApiFastifyPluginOptions<TRouter extends OpenApiRouter> =
  CreateOpenApiNodeHttpHandlerOptions<TRouter, any, any> & {
    basePath?: `/${string}`;
  };

const fastifyTRPCOpenApiPlugin = <TRouter extends AnyRouter>(
  fastify: FastifyInstance,
  opts: CreateOpenApiFastifyPluginOptions<TRouter>,
  done: (err?: Error) => void
): void => {
  let prefix = opts.basePath ?? "";

  if (prefix.endsWith("/")) {
    prefix = prefix.slice(0, -1);
  }

  const openApiHttpHandler = createOpenApiNodeHttpHandler(opts);

  fastify.route({
    method: ["GET", "DELETE", "PUT", "POST"],
    url: `${prefix}/*`,
    async handler(request, reply) {
      const prefixRemovedFromUrl = request.url.replace(fastify.prefix, "").replace(prefix, "");

      request.raw.url = prefixRemovedFromUrl;

      return await openApiHttpHandler(
        request,
        Object.assign(reply, {
          setHeader: (key: string, value: string | number | readonly string[]) => {
            if (Array.isArray(value)) {
              value.forEach((v) => reply.header(key, v));

              return reply;
            }

            return reply.header(key, value);
          },
          end: (body: any) => reply.send(body) // eslint-disable-line @typescript-eslint/no-explicit-any
        })
      );
    }
  });
  done();
};
const apiService = publicPlugin(async (fastify) => {
  await fastify.register(rateLimitPlugin, {
    max: 500,
    timeWindow: "1 minute",
    redis: fastify.redis
  });
  await fastify.register(corsPlugin, {
    credentials: true,
    methods: ["GET", "DELETE", "PUT", "POST"],
    origin(origin, callback) {
      if (!origin || origin === "null") {
        callback(null, true);

        return;
      }

      const { hostname } = new URL(origin);
      const appHostname = new URL(fastify.config.PUBLIC_APP_URL).hostname;

      if (
        hostname === "localhost" ||
        hostname.endsWith(appHostname) ||
        (fastify.config.VRITE_CLOUD && hostname.endsWith("swagger.io"))
      ) {
        callback(null, true);

        return;
      }

      callback(new Error("Not allowed"), false);
    }
  });
  await fastify.register(fastifyTRPCOpenApiPlugin, {
    basePath: "/",
    router: appRouter,
    createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }) {
      return createContext({ req, res }, fastify);
    }
  });
});

export { apiService };
