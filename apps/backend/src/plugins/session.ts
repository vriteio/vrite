import { config } from "#backend/lib/config";
import { redis, subscriberRedis } from "#backend/lib/redis";
import { Session, SessionData } from "#backend/services";
import Elysia, { status } from "elysia";

const authorize = async (sessionID?: string): Promise<SessionData> => {
  if (!sessionID) throw status("Unauthorized");

  const session = await Session.get(sessionID);

  if (!session) throw status("Unauthorized");

  return session;
};
const registerRedisSessionSubscriptions = async (app: Elysia) => {
  const handleRedisKeyEvent = async (key: string): Promise<void> => {
    if (!key.startsWith("session:")) return;

    const [, sessionId] = key.split(":");
    const roleId = await redis.hGet("session:role", sessionId);
    const userId = await redis.hGet("session:user", sessionId);
    const workspaceId = await redis.hGet("session:workspace", sessionId);

    if (roleId) {
      await redis.sRem(`role:${roleId}:sessions`, sessionId);
      await redis.hDel(`session:role`, sessionId);
    }

    if (userId) {
      await redis.sRem(`user:${userId}:sessions`, sessionId);
      await redis.hDel(`session:user`, sessionId);
    }

    if (workspaceId) {
      await redis.sRem(`workspace:${workspaceId}:sessions`, sessionId);
      await redis.hDel(`session:workspace`, sessionId);
    }
  };

  // Subscriptions require Redis config: notify-keyspace-events Egx
  await redis.configSet("notify-keyspace-events", "Egx");
  await subscriberRedis.subscribe("__keyevent@0__:expired", handleRedisKeyEvent);
  await subscriberRedis.subscribe("__keyevent@0__:del", handleRedisKeyEvent);

  return app;
};
const sessionPlugin = new Elysia({
  name: "session",
  cookie: {
    secrets: config.COOKIE_SECRET,
    sign: ["session"]
  }
})
  .macro({
    authorize(config?: boolean | {}) {
      return {
        async resolve({ cookie }) {
          return {
            session: await authorize(`${cookie.session.value}`)
          };
        }
      };
    }
  })
  .use(registerRedisSessionSubscriptions);

export { sessionPlugin, authorize };
