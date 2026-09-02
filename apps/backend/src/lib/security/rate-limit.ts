import { createHash } from "node:crypto";
import { incrementWithExpiry, redis } from "#backend/lib/adapters";

const RATE_LIMITS = {
  authentication: { max: 20, window: 60 },
  signIn: { max: 3, window: 10 },
  otp: { max: 3, window: 60 },
  inviteAcceptance: { max: 20, window: 60 },
  collaboration: { max: 30, window: 60 },
  semanticSearch: { max: 30, window: 60 },
  askAI: { max: 10, window: 60 }
} as const;

interface RateLimitInput {
  key: string;
  limit: {
    max: number;
    window: number;
  };
  scope: string;
}

const consumeRateLimit = async (input: RateLimitInput) => {
  const keyHash = createHash("sha256").update(input.key).digest("hex");
  const { count, ttl } = await incrementWithExpiry(
    redis,
    `rate-limit:${input.scope}:${keyHash}`,
    input.limit.window
  );

  return {
    allowed: count <= input.limit.max,
    retryAfter: Math.max(ttl, 1)
  };
};

export { RATE_LIMITS, consumeRateLimit };
