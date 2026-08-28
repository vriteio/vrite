import { toEntryID, toUUID } from "#backend/lib/primitives";
import { entries, entryPublications, memberships } from "#backend/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  type EntryAuthorizationSource,
  loadEntryAuthorizationSources,
  withAuthorization
} from "#backend/lib/policy";

interface DeleteEntriesInput {
  ids: string[];
}

const deleteEntries = withAuthorization<
  DeleteEntriesInput,
  EntryAuthorizationSource[],
  { entryIDs: string[] }
>(
  {
    actions: ({ resolved }) => ({
      entries: resolved.map(({ collectionID }) => ({ action: "entry:delete", collectionID }))
    }),
    resolve: ({ database, input, workspaceID }) => {
      return loadEntryAuthorizationSources({ database, entryIDs: input.ids, workspaceID });
    },
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    if (input.ids.length === 0) return { entryIDs: [] };

    const entryIDs = [...new Set(input.ids)].map(toUUID);
    const deleted = await (async () => {
      const rows = await database
        .update(entries)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            inArray(entries.id, entryIDs),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .returning({ id: entries.id });

      if (rows.length > 0) {
        await database.delete(entryPublications).where(
          inArray(
            entryPublications.entryID,
            rows.map(({ id }) => id)
          )
        );
        await database
          .update(memberships)
          .set({ currentEntryID: null, updatedAt: new Date() })
          .where(
            and(
              eq(memberships.workspaceID, workspaceID),
              inArray(
                memberships.currentEntryID,
                rows.map(({ id }) => id)
              )
            )
          );
      }

      return rows;
    })();

    return { entryIDs: deleted.map(({ id }) => toEntryID(id)) };
  }
);

export { deleteEntries };
