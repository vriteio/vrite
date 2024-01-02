import { envSchema } from "./env";
import createFastify, { FastifyInstance } from "fastify";
import envPlugin from "@fastify/env";
import zodToJsonSchema from "zod-to-json-schema";
import { hostConfigPlugin } from "#plugins";

const createServer = async (
  configure?: (server: FastifyInstance) => Promise<void>
): Promise<FastifyInstance> => {
  const server = createFastify({
    maxParamLength: 5000,
    logger: false
  });

  await server
    .register(envPlugin, {
      dotenv: true,
      schema: zodToJsonSchema(envSchema)
    })
    .register(hostConfigPlugin);

  if (configure) {
    await configure(server);
  }

  return server;
};

export { createServer };
