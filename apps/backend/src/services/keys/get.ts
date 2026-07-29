import { toKeyID, toMembershipID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { apiKeys, type Key } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

const mapKey = (key: typeof apiKeys.$inferSelect): Key => ({
  id: toKeyID(key.id),
  memberID: toMembershipID(key.memberID),
  name: key.name,
  permissions: key.permissions,
  prefix: key.prefix,
  createdAt: key.createdAt.toISOString(),
  updatedAt: key.updatedAt.toISOString(),
  expiresAt: key.expiresAt?.toISOString() || null
});
const getKey = async (input: { workspaceID: string; keyID: string }): Promise<Key> => {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.workspaceID, toUUID(input.workspaceID)), eq(apiKeys.id, toUUID(input.keyID)))
    );

  if (!key) throw new ORPCError("NOT_FOUND", { message: "Key not found" });

  return mapKey(key);
};

export { getKey, mapKey };
