import { appRouter } from "../routes";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { publicPlugin } from "#lib/plugin";
import { CustomError } from "#lib/errors";

const sessionPlugin = publicPlugin(async (fastify) => {
  fastify.post("/session/refresh", async (req, res) => {
    const caller = appRouter.createCaller({ db: fastify.mongo.db!, fastify, req, res });

    try {
      await caller.auth.refreshToken();
    } catch (error) {
      if (error instanceof CustomError) {
        const httpStatusCode = getHTTPStatusCodeFromError(error);

        res.status(httpStatusCode).send({ error: { message: error.message, cause: error.cause } });

        return;
      }
    }
  });
  fastify.get("/session/logout", async (req, res) => {
    const caller = appRouter.createCaller({ db: fastify.mongo.db!, fastify, req, res });

    try {
      await caller.auth.logout();
    } catch (error) {
      if (error instanceof CustomError) {
        const httpStatusCode = getHTTPStatusCodeFromError(error);

        res.status(httpStatusCode).send({ error: { message: error.message, cause: error.cause } });

        return;
      }
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
