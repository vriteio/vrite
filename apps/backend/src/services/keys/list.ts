import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type Key } from "#backend/db";
import { eq } from "drizzle-orm";
import { mapAPIKey } from "#backend/lib/data";

const listKeys = async (input: { workspaceID: string }): Promise<{ keys: Key[] }> => {
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.workspaceID, toUUID(input.workspaceID)));

  return { keys: keys.map(mapAPIKey) };
};

export { listKeys };
