import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys, type Key } from "#backend/db";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { mapAPIKey } from "#backend/lib/data";

const getKey = async (input: { workspaceID: string; keyID: string }): Promise<Key> => {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(eq(apiKeys.workspaceID, toUUID(input.workspaceID)), eq(apiKeys.id, toUUID(input.keyID)))
    );

  if (!key) throw new ORPCError("NOT_FOUND", { message: "Key not found" });

  return mapAPIKey(key);
};

export { getKey };
