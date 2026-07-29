import { toUUID } from "#backend/lib/id";
import { db } from "#backend/lib/postgres";
import { entries } from "#backend/db";
import { and, eq, inArray } from "drizzle-orm";

const deleteEntries = async (input: { ids: string[]; workspaceID: string }): Promise<void> => {
  if (input.ids.length === 0) return;

  await db
    .delete(entries)
    .where(
      and(
        inArray(entries.id, input.ids.map(toUUID)),
        eq(entries.workspaceID, toUUID(input.workspaceID))
      )
    );
};

export { deleteEntries };
