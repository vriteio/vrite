import { apiKeys, type Key } from "#backend/db";
import { toKeyID, toMembershipID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { hashKey } from "#backend/lib/security";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";

const verifyAPIKey = async (rawKey: string): Promise<typeof apiKeys.$inferSelect | null> => {
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
const mapAPIKey = (key: typeof apiKeys.$inferSelect): Key => ({
  id: toKeyID(key.id),
  memberID: toMembershipID(key.memberID),
  name: key.name,
  permissions: key.permissions,
  prefix: key.prefix,
  createdAt: key.createdAt.toISOString(),
  updatedAt: key.updatedAt.toISOString(),
  expiresAt: key.expiresAt?.toISOString() || null
});

export { mapAPIKey, verifyAPIKey };
