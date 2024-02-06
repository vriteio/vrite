import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { FastifyReply, FastifyRequest } from "fastify";
import { appRouter } from "#routes";
import { createPlugin } from "#lib/plugin";
import { createContext } from "#lib/context";

const trpcPlugin = createPlugin(async (fastify) => {
  await fastify.register(fastifyTRPCPlugin, {
    prefix: "/api/v1",
    useWSS: true,
    trpcOptions: {
      router: appRouter,
      createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }) {
        return createContext({ req, res }, fastify);
      }
    }
  });
});

export { trpcPlugin };
