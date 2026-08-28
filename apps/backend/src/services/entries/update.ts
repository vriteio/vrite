import { toUUID } from "#backend/lib/primitives";
import { entries, type Entry } from "#backend/db";
import { and, eq, isNull } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { normalizeEntryName } from "#backend/lib/validation";
import { withAuthorization } from "#backend/lib/policy";

interface UpdateEntryInput extends Partial<Pick<Entry, "name">> {
  id: string;
}
interface ResolvedUpdateEntry {
  entry: { collectionID: string | null };
}

const updateEntry = withAuthorization<UpdateEntryInput, ResolvedUpdateEntry>(
  {
    actions: ({ resolved }) => ({
      entries: [{ action: "entry:update", collectionID: resolved.entry.collectionID }]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const [entry] = await database
        .select({ collectionID: entries.collectionID })
        .from(entries)
        .where(
          and(
            eq(entries.id, toUUID(input.id)),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .for("update");

      if (!entry) throw new ORPCError("NOT_FOUND");

      return { entry };
    },
    transaction: "locked-workspace"
  },
  async ({ database, input, workspaceID }) => {
    if (input.name === undefined) return;

    const name = normalizeEntryName(input.name);
    const [updated] = await database
      .update(entries)
      .set({ name, updatedAt: new Date() })
      .where(
        and(
          eq(entries.id, toUUID(input.id)),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .returning({ id: entries.id });

    if (!updated) throw new ORPCError("NOT_FOUND");
  }
);

export { updateEntry };
