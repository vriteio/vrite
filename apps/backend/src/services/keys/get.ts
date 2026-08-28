import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type Key } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { mapAPIKey } from "#backend/lib/data";

interface GetKeyInput {
  keyID: string;
}

const getKeyOperation = async (input: GetKeyInput & { workspaceID: string }): Promise<Key> => {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.workspaceID, toUUID(input.workspaceID)), eq(apiKeys.id, toUUID(input.keyID)))
    );

  if (!key) throw new ORPCError("NOT_FOUND", { message: "Key not found" });

  return mapAPIKey(key);
};
const getKey = withAuthorization<GetKeyInput, undefined, Key>(
  { permissions: { session: ["read:api_keys"] } },
  async ({ input, workspaceID }) => getKeyOperation({ ...input, workspaceID })
);

export { getKey };
