import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { appRouter } from "#routes";
import { publicPlugin, errors } from "#lib";

const sessionPlugin = publicPlugin(async (fastify) => {
  fastify.post("/session/refresh", async (req, res) => {
    const caller = appRouter.createCaller({ db: fastify.mongo.db!, fastify, req, res });

    try {
      await caller.auth.refreshToken();
    } catch (e) {
      const error = e as errors.CustomError;
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
      const error = e as errors.CustomError;
      const httpStatusCode = getHTTPStatusCodeFromError(error);

      res
        .status(httpStatusCode)
        .send({ error: { message: error.message, cause: error.causeData } });

      return;
    }
  });
  /**
   * Requires Redis config: notify-keyspace-events Ex
   */
  fastify.pubsub.subscribe("__keyevent@0__:expired", async ({ data }) => {
    if (data.startsWith("session:")) {
      const [, sessionId] = data.split(":");
      const roleId = await fastify.redis.hget("session:role", sessionId);
      const userId = await fastify.redis.hget("session:user", sessionId);

      if (roleId) await fastify.redis.srem(`role:${roleId}:sessions`, sessionId);
      if (userId) await fastify.redis.srem(`user:${userId}:sessions`, sessionId);
    }
  });
});

export { sessionPlugin };
