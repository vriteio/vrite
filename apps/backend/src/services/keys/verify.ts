import { db } from "#backend/lib/postgres";
import { apiKeys } from "#backend/db";
import { hashKey } from "#backend/lib/utils";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";

const verifyKey = async (rawKey: string): Promise<typeof apiKeys.$inferSelect | null> => {
  const prefix = rawKey.slice(0, 12);
  const candidates = await db.select().from(apiKeys).where(eq(apiKeys.prefix, prefix));

  for (const candidate of candidates) {
    if (candidate.expiresAt && candidate.expiresAt <= new Date()) continue;
    const actual = Buffer.from(hashKey(rawKey, candidate.salt), "hex");
    const expected = Buffer.from(candidate.hash, "hex");

    if (actual.length === expected.length && timingSafeEqual(actual, expected)) return candidate;
  }

  return null;
};

export { verifyKey };
