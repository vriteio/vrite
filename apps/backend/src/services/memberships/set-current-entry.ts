import { entries, memberships } from "#backend/db";
import { toUUID } from "#backend/lib/primitives";
import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { withAuthorization } from "#backend/lib/policy";

interface SetCurrentEntryInput {
  entryID: string;
}
interface ResolvedCurrentEntry {
  entry: { collectionID: string | null };
}

const setCurrentEntry = withAuthorization<SetCurrentEntryInput, ResolvedCurrentEntry>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "entry:read", collectionID: resolved.entry.collectionID }]
    }),
    permissions: { session: true },
    resolve: async ({ database, input, workspaceID }) => {
      const [entry] = await database
        .select({ collectionID: entries.collectionID })
        .from(entries)
        .where(
          and(
            eq(entries.id, toUUID(input.entryID)),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        );

      if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });

      return { entry };
    }
  },
  async ({ auth, database, input, workspaceID }) => {
    const entryID = toUUID(input.entryID);
    const memberID = toUUID(auth.session!.memberID);
    await database
      .update(memberships)
      .set({ currentEntryID: entryID, updatedAt: new Date() })
      .where(and(eq(memberships.id, memberID), eq(memberships.workspaceID, workspaceID)));
  }
);

export { setCurrentEntry };
