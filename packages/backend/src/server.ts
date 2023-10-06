import { envSchema } from "./env";
import createFastify, { FastifyInstance } from "fastify";
import envPlugin from "@fastify/env";
import mongoPlugin from "@fastify/mongodb";
import redisPlugin from "@fastify/redis";
import jwtPlugin from "@fastify/jwt";
import cookiePlugin from "@fastify/cookie";
import zodToJsonSchema from "zod-to-json-schema";
import {
  gitSyncPlugin,
  hostConfigPlugin,
  searchPlugin,
  databasePlugin,
  pubSubPlugin,
  sessionPlugin,
  mailPlugin,
  s3Plugin,
  OAuthPlugin
} from "#plugins";

const createServer = async (
  pluginOptions: Partial<{
    database: boolean;
    pubSub: boolean;
    storage: boolean;
    auth: boolean;
    email: boolean;
    gitSync: boolean;
    search: boolean;
  }>
): Promise<FastifyInstance> => {
  const server = createFastify({
    maxParamLength: 5000,
    logger: false
  });

  // Env
  await server
    .register(envPlugin, {
      dotenv: true,
      schema: zodToJsonSchema(envSchema)
    })
    .register(hostConfigPlugin);

  // Data
  if (pluginOptions.database) {
    await server.register(mongoPlugin, {
      forceClose: true,
      url: server.config.MONGO_URL
    });
    await server.register(databasePlugin);
  }

  if (pluginOptions.pubSub) {
    await server
      .register(redisPlugin, { url: server.config.REDIS_URL })
      .register(redisPlugin, { url: server.config.REDIS_URL, namespace: "sub" });
    await server.register(pubSubPlugin);
  }

  if (pluginOptions.storage) {
    await server.register(s3Plugin);
  }

  // Auth
  if (pluginOptions.auth) {
    await server
      .register(cookiePlugin, { secret: server.config.SECRET })
      .register(jwtPlugin, {
        secret: server.config.SECRET,
        cookie: { cookieName: "accessToken", signed: true }
      })
      .register(sessionPlugin)
      .register(OAuthPlugin);
  }

  // Email
  if (pluginOptions.email) {
    await server.register(mailPlugin);
  }

  // GitHub sync
  if (pluginOptions.gitSync) {
    await server.register(gitSyncPlugin);
  }

  if (pluginOptions.search) {
    await server.register(searchPlugin);
  }

  return server;
};

export { createServer };
