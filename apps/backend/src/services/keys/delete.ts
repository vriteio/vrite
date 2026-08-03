import { toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { apiKeys } from "#backend/db";
import { and, eq, inArray } from "drizzle-orm";

const deleteKeys = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  if (input.ids.length === 0) return;

  await db
    .delete(apiKeys)
    .where(
      and(
        inArray(apiKeys.id, input.ids.map(toUUID)),
        eq(apiKeys.workspaceID, toUUID(input.workspaceID))
      )
    );
};

export { deleteKeys };
