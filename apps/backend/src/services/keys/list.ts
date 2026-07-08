import { keysDB, Key, toKeyID, toMembershipID } from "#backend/db";
import { toUUID } from "#backend/lib/mongo";

const listKeys = async (input: { workspaceID: string }): Promise<Key[]> => {
  const keys = await keysDB.find({ workspaceID: toUUID(input.workspaceID) }).toArray();

  return keys.map((key) => ({
    id: toKeyID(key._id),
    memberID: toMembershipID(key.memberID),
    name: key.name,
    permissions: key.permissions,
    prefix: key.prefix,
    createdAt: `${key.createdAt.toISOString()}`,
    updatedAt: `${key.updatedAt.toISOString()}`,
    expiresAt: key.expiresAt ? `${key.expiresAt.toISOString()}` : null
  }));
};

export { listKeys };
