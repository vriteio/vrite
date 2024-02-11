import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import jwtPlugin from "@fastify/jwt";
import cookiePlugin from "@fastify/cookie";
import { appRouter } from "#routes";
import { createPlugin } from "#lib/plugin";
import { CustomError } from "#lib/errors";

const sessionPlugin = createPlugin(async (fastify) => {
  await fastify.register(cookiePlugin, { secret: fastify.config.SECRET }).register(jwtPlugin, {
    secret: fastify.config.SECRET,
    cookie: { cookieName: "accessToken", signed: true }
  });
  fastify.post("/session/refresh", async (req, res) => {
    const caller = appRouter.createCaller({ db: fastify.mongo.db!, fastify, req, res });

    try {
      await caller.auth.refreshToken();
    } catch (e) {
      const error = e as CustomError;
      const httpStatusCode = getHTTPStatusCodeFromError(error);

      res
        .status(httpStatusCode)
        .send({ error: { message: error.message, cause: error.causeData } });

      return;
    }
  });
  fastify.post("/session/logout", async (req, res) => {
    const caller = appRouter.createCaller({ db: fastify.mongo.db!, fastify, req, res });

    try {
      await caller.auth.logout();
    } catch (e) {
      const error = e as CustomError;
      const httpStatusCode = getHTTPStatusCodeFromError(error);

      res
        .status(httpStatusCode)
        .send({ error: { message: error.message, cause: error.causeData } });

      return;
    }
  });

  /**
   * Requires Redis config: notify-keyspace-events Egx
   */
  const handleRedisKeyEvent = async ({ data }: { data: any }): Promise<void> => {
    if (data.startsWith("session:")) {
      const [, sessionId] = data.split(":");
      const roleId = await fastify.redis.hget("session:role", sessionId);
      const userId = await fastify.redis.hget("session:user", sessionId);
      const workspaceId = await fastify.redis.hget("session:workspace", sessionId);

      if (roleId) {
        await fastify.redis.srem(`role:${roleId}:sessions`, sessionId);
        await fastify.redis.hdel(`session:role`, sessionId);
      }

      if (userId) {
        await fastify.redis.srem(`user:${userId}:sessions`, sessionId);
        await fastify.redis.hdel(`session:user`, sessionId);
      }

      if (workspaceId) {
        await fastify.redis.srem(`workspace:${workspaceId}:sessions`, sessionId);
        await fastify.redis.hdel(`session:workspace`, sessionId);
      }
    }
  };

  fastify.pubsub.subscribe("__keyevent@0__:expired", handleRedisKeyEvent);
  fastify.pubsub.subscribe("__keyevent@0__:del", handleRedisKeyEvent);
});

export { sessionPlugin };
