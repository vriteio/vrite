import { toKeyID, toMembershipID, toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { apiKeys, type Key } from "#backend/db";
import { generateKeyValue, generateSalt, hashKey } from "#backend/lib/utils";
import { Auth } from "#backend/services/auth";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

type ExpirationOption = "now" | "1h" | "24h" | "7d";
const getExpiresAt = (option: ExpirationOption): Date => {
  const durations = { "now": 0, "1h": 3600e3, "24h": 86400e3, "7d": 7 * 86400e3 };

  return new Date(Date.now() + durations[option]);
};
const rotateKey = async (input: {
  id: string;
  workspaceID: string;
  memberID: string;
  expiresIn: ExpirationOption;
}): Promise<Key & { rawKey: string }> => {
  const workspaceID = toUUID(input.workspaceID);
  const { raw, prefix } = generateKeyValue();
  const salt = generateSalt();
  const now = new Date();
  const newKey = await db.transaction(async (tx) => {
    const [oldKey] = await tx
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, toUUID(input.id)), eq(apiKeys.workspaceID, workspaceID)))
      .for("update");

    if (!oldKey) throw new ORPCError("NOT_FOUND", { message: "Key not found" });

    await tx
      .update(apiKeys)
      .set({ expiresAt: getExpiresAt(input.expiresIn), updatedAt: now })
      .where(eq(apiKeys.id, oldKey.id));
    const [created] = await tx
      .insert(apiKeys)
      .values({
        name: oldKey.name,
        permissions: oldKey.permissions,
        prefix,
        memberID: toUUID(input.memberID),
        workspaceID,
        hash: hashKey(raw, salt),
        salt,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return created;
  });

  await Auth.invalidateSessionData({ keyID: input.id });

  return {
    id: toKeyID(newKey.id),
    memberID: toMembershipID(newKey.memberID),
    name: newKey.name,
    permissions: newKey.permissions,
    prefix,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: null,
    rawKey: raw
  };
};

export { rotateKey };
export type { ExpirationOption };
