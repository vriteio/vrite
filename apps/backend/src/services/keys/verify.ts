import { keysDB, FullKey } from "#backend/db";
import { hashKey } from "#backend/lib/utils";
import type { UUID } from "#backend/lib/mongo";

const verifyKey = async (rawKey: string): Promise<FullKey<UUID> | null> => {
  const prefix = rawKey.slice(0, 12);
  const candidates = await keysDB.find({ prefix }).toArray();

  for (const candidate of candidates) {
    if (candidate.expiresAt && candidate.expiresAt <= new Date()) {
      continue;
    }

    const computedHash = hashKey(rawKey, candidate.salt);

    if (computedHash === candidate.hash) {
      return {
        id: candidate._id,
        name: candidate.name,
        permissions: candidate.permissions,
        prefix: candidate.prefix,
        memberID: candidate.memberID,
        createdAt: candidate.createdAt,
        updatedAt: candidate.updatedAt,
        expiresAt: candidate.expiresAt,
        workspaceID: candidate.workspaceID,
        hash: candidate.hash,
        salt: candidate.salt
      };
    }
  }

  return null;
};

export { verifyKey };
