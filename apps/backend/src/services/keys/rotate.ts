import { toKeyID, toMembershipID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type Key } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { generateKeyValue, generateSalt, hashKey } from "#backend/lib/security";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";

type ExpirationOption = "now" | "1h" | "24h" | "7d";
interface RotateKeyInput {
  expiresIn: ExpirationOption;
  id: string;
}

const getExpiresAt = (option: ExpirationOption): Date => {
  const durations = { "now": 0, "1h": 3600e3, "24h": 86400e3, "7d": 7 * 86400e3 };

  return new Date(Date.now() + durations[option]);
};
const rotateKeyOperation = async (
  input: RotateKeyInput & { workspaceID: string; memberID: string }
): Promise<Key & { rawKey: string }> => {
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
const rotateKey = withAuthorization<RotateKeyInput, undefined, Key & { rawKey: string }>(
  { permissions: { session: ["api_keys"] } },
  async ({ auth, input, workspaceID }) => {
    return rotateKeyOperation({ ...input, memberID: auth.session!.memberID, workspaceID });
  }
);

export { rotateKey };
export type { ExpirationOption };
