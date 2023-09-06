import { OAuthPlugin } from "./plugins/oauth";
import { s3Plugin } from "./plugins/s3";
import { mailPlugin } from "./plugins/email";
import { sessionPlugin } from "./plugins/session";
import { pubSubPlugin } from "./plugins/pub-sub";
import { envSchema } from "./env";
import { databasePlugin } from "./plugins/database";
import createFastify, { FastifyInstance } from "fastify";
import envPlugin from "@fastify/env";
import mongoPlugin from "@fastify/mongodb";
import redisPlugin from "@fastify/redis";
import jwtPlugin from "@fastify/jwt";
import cookiePlugin from "@fastify/cookie";
import zodToJsonSchema from "zod-to-json-schema";
import { ZodRawShape } from "zod";
import { gitSyncPlugin, hostConfigPlugin, searchPlugin } from "#plugins";

const createServer = async (envSchemaExtension?: ZodRawShape): Promise<FastifyInstance> => {
  const server = createFastify({
    maxParamLength: 5000,
    logger: false
  });

  // Env
  await server
    .register(envPlugin, {
      dotenv: true,
      schema: zodToJsonSchema(envSchema.extend(envSchemaExtension || {}))
    })
    .register(hostConfigPlugin);
  // Data
  await server
    .register(mongoPlugin, {
      forceClose: true,
      url: server.config.MONGO_URL,
      database: server.config.DATABASE
    })
    .register(redisPlugin, { url: server.config.REDIS_URL })
    .register(redisPlugin, { url: server.config.REDIS_URL, namespace: "sub" });
  await server.register(databasePlugin).register(pubSubPlugin).register(s3Plugin);
  // Auth
  await server
    .register(cookiePlugin, { secret: server.config.SECRET })
    .register(jwtPlugin, {
      secret: server.config.SECRET,
      cookie: { cookieName: "accessToken", signed: true }
    })
    .register(sessionPlugin)
    .register(OAuthPlugin);
  // Email
  await server.register(mailPlugin);
  // GitHub sync
  await server.register(gitSyncPlugin);
  await server.register(searchPlugin);

  return server;
};

export { createServer };
