import { toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, memberships } from "#backend/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

const deleteEntries = async (input: {
  ids: string[];
  workspaceID: string;
}): Promise<{ entryIDs: string[] }> => {
  if (input.ids.length === 0) return { entryIDs: [] };

  const deleted = await db
    .update(entries)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        inArray(entries.id, input.ids.map(toUUID)),
        eq(entries.workspaceID, toUUID(input.workspaceID)),
        isNull(entries.deletedAt)
      )
    )
    .returning({ id: entries.id });

  if (deleted.length > 0) {
    await db
      .update(memberships)
      .set({ currentEntryID: null, updatedAt: new Date() })
      .where(
        and(
          eq(memberships.workspaceID, toUUID(input.workspaceID)),
          inArray(
            memberships.currentEntryID,
            deleted.map(({ id }) => id)
          )
        )
      );
  }

  return { entryIDs: deleted.map(({ id }) => toEntryID(id)) };
};

export { deleteEntries };
