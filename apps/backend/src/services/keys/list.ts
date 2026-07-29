import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { apiKeys, type Key } from "#backend/db";
import { eq } from "drizzle-orm";
import { mapKey } from "./get";

const listKeys = async (input: { workspaceID: string }): Promise<Key[]> => {
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.workspaceID, toUUID(input.workspaceID)));

  return keys.map(mapKey);
};

export { listKeys };
