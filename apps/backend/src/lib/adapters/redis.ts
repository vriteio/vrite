import { config } from "#backend/lib/config";
import { createClient } from "redis";

const redis = createClient({ url: config.REDIS_URL });
const subscriberRedis = redis.duplicate();
const incrementWithExpiry = async (
  redisClient: typeof redis | typeof subscriberRedis,
  key: string,
  ttl: number
) => {
  const [count, , remainingTTL] = await redisClient
    .multi()
    .incr(key)
    .expire(key, ttl, "NX")
    .ttl(key)
    .exec();

  return { count: Number(count), ttl: Number(remainingTTL) };
};

redis.on("error", (error) => {
  console.error("Redis client error", { error });
});
subscriberRedis.on("error", (error) => {
  console.error("Redis subscriber error", { error });
});

await redis.connect();
await subscriberRedis.connect();

export { redis, subscriberRedis, incrementWithExpiry };
