import { config } from "#backend/lib/config";
import { Redis as RedisExtension } from "@hocuspocus/extension-redis";

class CollaborationRedisExtension extends RedisExtension {
  constructor(configuration: ConstructorParameters<typeof RedisExtension>[0]) {
    super(configuration);

    this.pub.on("error", (error) => {
      console.error("Collaboration Redis publisher error", { error });
    });
    this.sub.on("error", (error) => {
      console.error("Collaboration Redis subscriber error", { error });
    });
  }

  async afterLoadDocument(...args: Parameters<RedisExtension["afterLoadDocument"]>): Promise<void> {
    try {
      await super.afterLoadDocument(...args);
    } catch (error) {
      console.error("Collaboration Redis initialization failed", { error });
      throw error;
    }
  }
}

const collaborationRedisURL = new URL(config.REDIS_URL);
const collaborationRedisDatabase = Number(collaborationRedisURL.pathname.slice(1) || "0");
const collaborationRedis = new CollaborationRedisExtension({
  host: collaborationRedisURL.hostname,
  port: Number(collaborationRedisURL.port || "6379"),
  prefix: "andesine:collaboration",
  options: {
    db: collaborationRedisDatabase,
    ...(collaborationRedisURL.username && {
      username: decodeURIComponent(collaborationRedisURL.username)
    }),
    ...(collaborationRedisURL.password && {
      password: decodeURIComponent(collaborationRedisURL.password)
    }),
    ...(collaborationRedisURL.protocol === "rediss:" && { tls: {} })
  }
});

export { collaborationRedis };
