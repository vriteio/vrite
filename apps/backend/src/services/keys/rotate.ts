import { keysDB, Key, toKeyID, toMembershipID } from "#backend/db";
import { generateUUID, toUUID, UnderscoreID } from "#backend/lib/mongo";
import { generateKeyValue, generateSalt, hashKey } from "#backend/lib/utils";
import type { UUID } from "#backend/lib/mongo";
import type { FullKey } from "#backend/db";
import { Auth } from "#backend/services/auth";
import { ORPCError } from "@orpc/server";

type ExpirationOption = "now" | "1h" | "24h" | "7d";

const getExpiresAt = (option: ExpirationOption): Date => {
  const now = new Date();

  switch (option) {
    case "now":
      return now;
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "24h":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
};
const rotateKey = async (input: {
  id: string;
  workspaceID: string;
  memberID: string;
  expiresIn: ExpirationOption;
}): Promise<Key & { rawKey: string }> => {
  const workspaceID = toUUID(input.workspaceID);
  const oldKey = await keysDB.findOne({
    _id: toUUID(input.id),
    workspaceID
  });

  if (!oldKey) throw new ORPCError("NOT_FOUND", { message: "Key not found" });

  const expiresAt = getExpiresAt(input.expiresIn);

  // Mark the old key for expiration
  await keysDB.updateOne({ _id: oldKey._id }, { $set: { expiresAt } });
  await Auth.invalidateSessionData({ keyID: input.id });

  // Create the new key with same name and permissions
  const { raw, prefix } = generateKeyValue();
  const salt = generateSalt();
  const hash = hashKey(raw, salt);
  const now = new Date();
  const newKey: UnderscoreID<FullKey<UUID>> = {
    _id: generateUUID(),
    name: oldKey.name,
    permissions: oldKey.permissions,
    prefix,
    memberID: toUUID(input.memberID),
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    workspaceID,
    hash,
    salt
  };

  await keysDB.insertOne(newKey);

  return {
    id: toKeyID(newKey._id),
    memberID: toMembershipID(newKey.memberID),
    name: newKey.name,
    permissions: newKey.permissions,
    prefix,
    createdAt: `${now.toISOString()}`,
    updatedAt: `${now.toISOString()}`,
    expiresAt: null,
    rawKey: raw
  };
};

export { rotateKey };
export type { ExpirationOption };
