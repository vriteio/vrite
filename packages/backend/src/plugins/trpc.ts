import { publicPlugin } from "../lib/plugin";
import { createContext } from "../lib/context";
import { appRouter } from "../routes";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { FastifyReply, FastifyRequest } from "fastify";

const trpcPlugin = publicPlugin(async (fastify) => {
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
