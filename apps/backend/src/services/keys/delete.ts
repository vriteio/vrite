import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { apiKeys } from "#backend/db";
import { Auth } from "#backend/services/auth";
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
  await Promise.all(input.ids.map((id) => Auth.invalidateSessionData({ keyID: id })));
};

export { deleteKeys };
