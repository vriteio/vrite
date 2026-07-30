import { config } from "#backend/lib/config";
import { createClient } from "redis";

const redis = await createClient({ url: config.REDIS_URL }).connect();
const subscriberRedis = await redis.duplicate().connect();
const incrementWithExpiry = async (key: string, ttl: number) => {
  const [count, , remainingTTL] = await redis
    .multi()
    .incr(key)
    .expire(key, ttl, "NX")
    .ttl(key)
    .exec();

  return { count: Number(count), ttl: Number(remainingTTL) };
};

export { incrementWithExpiry, redis, subscriberRedis };
