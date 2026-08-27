import { toEntryID, toUUID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { entries, entryPublications, memberships } from "#backend/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  assertEntryPermission,
  loadRestrictedCollectionAccess,
  type SessionData
} from "#backend/lib/policy";

const deleteEntries = async (input: {
  auth: SessionData;
  ids: string[];
  workspaceID: string;
}): Promise<{ entryIDs: string[] }> => {
  if (input.ids.length === 0) return { entryIDs: [] };

  const access = await loadRestrictedCollectionAccess(input.auth);

  await Promise.all(
    input.ids.map((entryID) => assertEntryPermission(input.auth, access, entryID, "content"))
  );

  const deleted = await db.transaction(async (tx) => {
    const rows = await tx
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

    if (rows.length > 0) {
      await tx.delete(entryPublications).where(
        inArray(
          entryPublications.entryID,
          rows.map(({ id }) => id)
        )
      );
      await tx
        .update(memberships)
        .set({ currentEntryID: null, updatedAt: new Date() })
        .where(
          and(
            eq(memberships.workspaceID, toUUID(input.workspaceID)),
            inArray(
              memberships.currentEntryID,
              rows.map(({ id }) => id)
            )
          )
        );
    }

    return rows;
  });

  return { entryIDs: deleted.map(({ id }) => toEntryID(id)) };
};

export { deleteEntries };
