import { toKeyID, toMembershipID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { apiKeys, type Key } from "#backend/db";
import { generateKeyValue, generateSalt, hashKey } from "#backend/lib/utils";

const createKey = async (
  input: Pick<Key, "name" | "permissions"> & { workspaceID: string; memberID: string }
): Promise<Key & { rawKey: string }> => {
  const { raw, prefix } = generateKeyValue();
  const salt = generateSalt();
  const now = new Date();
  const [key] = await db
    .insert(apiKeys)
    .values({
      name: input.name,
      permissions: input.permissions,
      prefix,
      memberID: toUUID(input.memberID),
      workspaceID: toUUID(input.workspaceID),
      hash: hashKey(raw, salt),
      salt,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return {
    id: toKeyID(key.id),
    memberID: toMembershipID(key.memberID),
    name: key.name,
    permissions: key.permissions,
    prefix,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: null,
    rawKey: raw
  };
};

export { createKey };
