import { keysDB, Key, toKeyID, FullKey, toMembershipID } from "#backend/db";
import { generateUUID, toUUID, UnderscoreID } from "#backend/lib/mongo";
import { generateKeyValue, generateSalt, hashKey } from "#backend/lib/utils";
import type { UUID } from "#backend/lib/mongo";

const createKey = async (
  input: Pick<Key, "name" | "permissions"> & {
    workspaceID: string;
    memberID: string;
  }
): Promise<Key & { rawKey: string }> => {
  const { raw, prefix } = generateKeyValue();
  const salt = generateSalt();
  const hash = hashKey(raw, salt);
  const now = new Date();
  const key: UnderscoreID<FullKey<UUID>> = {
    _id: generateUUID(),
    name: input.name,
    permissions: input.permissions,
    prefix,
    memberID: toUUID(input.memberID),
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    workspaceID: toUUID(input.workspaceID),
    hash,
    salt
  };

  await keysDB.insertOne(key);

  return {
    id: toKeyID(key._id),
    memberID: toMembershipID(key.memberID),
    name: key.name,
    permissions: key.permissions,
    prefix,
    createdAt: `${now.toISOString()}`,
    updatedAt: `${now.toISOString()}`,
    expiresAt: null,
    rawKey: raw
  };
};

export { createKey };
