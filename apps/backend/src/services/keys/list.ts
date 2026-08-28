import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type Key } from "#backend/db";
import { withAuthorization } from "#backend/lib/policy";
import { eq } from "drizzle-orm";
import { mapAPIKey } from "#backend/lib/data";

const listKeysOperation = async (input: { workspaceID: string }): Promise<{ keys: Key[] }> => {
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.workspaceID, toUUID(input.workspaceID)));

  return { keys: keys.map(mapAPIKey) };
};
const listKeys = withAuthorization<Record<never, never>, undefined, { keys: Key[] }>(
  { permissions: { session: ["read:api_keys"] } },
  async ({ workspaceID }) => listKeysOperation({ workspaceID })
);

export { listKeys };
