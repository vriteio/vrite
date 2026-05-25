import { keysDB, Key, toKeyID, FullKey, toMembershipID } from "#backend/db";
import { toObjectID, UnderscoreID } from "#backend/lib/mongo";
import { generateKeyValue, generateSalt, hashKey } from "#backend/lib/utils";
import { ObjectId } from "mongodb";

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
  const key: UnderscoreID<FullKey<ObjectId>> = {
    _id: new ObjectId(),
    name: input.name,
    permissions: input.permissions,
    prefix,
    memberID: toObjectID(input.memberID),
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    workspaceID: toObjectID(input.workspaceID),
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
