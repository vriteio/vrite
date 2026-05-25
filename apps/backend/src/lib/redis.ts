import { config } from "#backend/lib/config";
import { createClient } from "redis";

const redis = await createClient({ url: config.REDIS_URL }).connect();
const subscriberRedis = await redis.duplicate().connect();

export { redis, subscriberRedis };
