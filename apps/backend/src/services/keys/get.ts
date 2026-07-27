import { keysDB, Key, toKeyID, toMembershipID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";
import { ORPCError } from "@orpc/server";

const getKey = async (input: { workspaceID: string; keyID: string }): Promise<Key> => {
  const key = await keysDB.findOne({
    workspaceID: toUUID(input.workspaceID),
    _id: toUUID(input.keyID)
  });

  if (!key) {
    throw new ORPCError("NOT_FOUND", { message: "Key not found" });
  }

  return {
    id: toKeyID(key._id),
    memberID: toMembershipID(key.memberID),
    name: key.name,
    permissions: key.permissions,
    prefix: key.prefix,
    createdAt: `${key.createdAt.toISOString()}`,
    updatedAt: `${key.updatedAt.toISOString()}`,
    expiresAt: key.expiresAt ? `${key.expiresAt.toISOString()}` : null
  };
};

export { getKey };
